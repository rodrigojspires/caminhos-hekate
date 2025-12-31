#!/usr/bin/env tsx

import { prisma } from '@hekate/database'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

function daysDiff(a: Date, b: Date) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.floor((A - B) / (24 * 60 * 60 * 1000))
}

type InvoiceLineItem = {
  type: 'subscription' | 'community'
  id?: string
  label: string
  amount: number
}

async function buildCommunityLineItems(userId: string, userTier: string): Promise<InvoiceLineItem[]> {
  const memberships = await prisma.communityMembership.findMany({
    where: { userId, status: { in: ['active', 'pending'] } },
    include: {
      community: {
        select: { id: true, name: true, price: true, tier: true, accessModels: true }
      }
    }
  })

  const items: InvoiceLineItem[] = []

  for (const membership of memberships) {
    const community = membership.community
    if (!community) continue

    const accessModels = (community.accessModels as string[]) || []
    const isPaidCommunity = accessModels.includes('ONE_TIME')
    const isSubscriptionCommunity = accessModels.includes('SUBSCRIPTION')
    const allowedByTier = isSubscriptionCommunity && (tierOrder[userTier] >= tierOrder[community.tier || 'FREE'])

    if (!isPaidCommunity || allowedByTier) continue

    const amount = community.price != null ? Number(community.price) : 0
    if (amount <= 0) continue

    items.push({
      type: 'community',
      id: community.id,
      label: community.name,
      amount
    })
  }

  return items
}

async function processSubscriptions() {
  const now = new Date()
  console.log(`[billing] Running at ${now.toISOString()}`)

  // Fetch subscriptions that are up for renewal or past due
  const subs = await prisma.userSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
    },
    include: { plan: true },
  })

  let renewed = 0
  let canceled = 0
  let invoicesCreated = 0

  for (const sub of subs) {
    const end = sub.currentPeriodEnd
    if (!end) continue

    // 5-day reminder before period end (daily)
    const daysUntilEnd = daysDiff(end, now) // positive when end is after now
    if (daysUntilEnd === 5) {
      const lastRemForEnd = (sub.metadata as any)?.lastReminderForEnd
      const endKey = end.toISOString().slice(0, 10)
      if (lastRemForEnd !== endKey) {
        try {
          const user = await prisma.user.findUnique({ where: { id: sub.userId } })
          const prefs = await prisma.notificationPreference.findUnique({ where: { userId: sub.userId } })

          // Cria notificação interna (para UI)
          await prisma.notification.create({
            data: {
              userId: sub.userId,
              type: 'SUBSCRIPTION_EXPIRING' as any,
              title: 'Sua assinatura está perto de renovar',
              content: `Faltam 5 dias para a renovação do plano ${(sub.plan as any)?.name || ''}. Antecipe o pagamento para evitar interrupções.`,
              channel: 'BOTH' as any,
              status: 'queued',
              metadata: { subscriptionId: sub.id, currentPeriodEnd: end.toISOString() },
            },
          })

          // Envia email (se possível)
          if (user?.email) {
            try {
              const { emailService } = await import('@/lib/email')
              await emailService.sendEmail({
                priority: 'NORMAL',
                toEmail: user.email,
                subject: 'Sua assinatura renova em 5 dias',
                htmlContent: `
                  <p>Olá${user.name ? `, ${user.name}` : ''}!</p>
                  <p>Faltam 5 dias para a renovação do seu plano <strong>${(sub.plan as any)?.name || ''}</strong>.</p>
                  <p>Você pode antecipar o pagamento acessando a sua página de faturas.</p>
                  <p><a href="${process.env.NEXTAUTH_URL}/minhas-faturas">Abrir Minhas Faturas</a></p>
                `,
              })
            } catch (e) {
              console.warn('[billing] email reminder failed', e)
            }
          }

          // Envia WhatsApp (Evolution API), se habilitado
          if (prefs?.whatsapp && prefs.whatsappNumber) {
            try {
              const { sendTemplateMessage } = await import('@/lib/whatsapp/evolution')
              await sendTemplateMessage({
                to: prefs.whatsappNumber,
                template: 'Olá {{name}}! Faltam 5 dias para renovar seu plano {{plan}}. Pague antecipado em {{url}}',
                variables: {
                  name: user?.name || '',
                  plan: (sub.plan as any)?.name || 'Assinatura',
                  url: `${process.env.NEXTAUTH_URL}/minhas-faturas`,
                },
              })
            } catch (e) {
              console.warn('[billing] whatsapp reminder failed', e)
            }
          }
        } catch (e) {
          console.warn('[billing] failed to create reminder notification', e)
        }
        // mark reminder sent for this end date
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            metadata: {
              ...(sub.metadata as any || {}),
              lastReminderForEnd: endKey,
            },
          },
        })
      }
    }

    // Only act when period ended (by day)
    if (daysDiff(now, end) < 0) continue

    const start = sub.currentPeriodStart || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Check if there was a completed payment in the last period
    const paid = await prisma.paymentTransaction.findFirst({
      where: {
        subscriptionId: sub.id,
        status: 'COMPLETED',
        paidAt: { gte: start, lte: end },
      },
    })

    // Determine interval
    const billingInterval = (sub.metadata as any)?.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
    const periodMs = billingInterval === 'YEARLY'
      ? (sub.plan?.intervalCount || 1) * 365 * 24 * 60 * 60 * 1000
      : (sub.plan?.intervalCount || 1) * 30 * 24 * 60 * 60 * 1000

    if (!paid) {
      // Cancel access immediately if not paid by end of period
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', canceledAt: now },
      })
      try {
        await prisma.user.update({ where: { id: sub.userId }, data: { subscriptionTier: 'FREE' as any } })
      } catch {}
      canceled++
      continue
    }

    // Renew period
    const newStart = now
    const newEnd = new Date(now.getTime() + periodMs)
    await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
        metadata: {
          ...(sub.metadata as any || {}),
          lastRenewedAt: now.toISOString(),
        },
      },
    })
    renewed++

    // Create internal invoice (pending payment transaction) for next cycle
    const subscriptionAmount = billingInterval === 'YEARLY'
      ? Number(sub.plan?.yearlyPrice ?? sub.plan?.monthlyPrice ?? 0)
      : Number(sub.plan?.monthlyPrice ?? 0)

    const user = await prisma.user.findUnique({
      where: { id: sub.userId },
      select: { subscriptionTier: true }
    })
    const userTier = user?.subscriptionTier || 'FREE'

    const lineItems: InvoiceLineItem[] = []
    if (subscriptionAmount > 0) {
      lineItems.push({
        type: 'subscription',
        id: sub.id,
        label: `Assinatura ${(sub.plan as any)?.name || ''}`.trim(),
        amount: subscriptionAmount
      })
    }

    const communityItems = await buildCommunityLineItems(sub.userId, userTier)
    lineItems.push(...communityItems)

    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

    if (totalAmount > 0) {
      await prisma.paymentTransaction.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          amount: totalAmount,
          currency: 'BRL',
          status: 'PENDING',
          provider: 'MERCADOPAGO', // default provider; payment link is generated on demand
          metadata: {
            invoice_period_start: newStart.toISOString(),
            invoice_period_end: newEnd.toISOString(),
            billing_interval: billingInterval,
            created_by: 'subscription-billing-worker',
            description: 'Fatura mensal',
            lineItems,
          },
        },
      })
      invoicesCreated++
    }
  }

  console.log(`[billing] Done. renewed=${renewed} canceled=${canceled} invoices=${invoicesCreated}`)
}

async function processCommunityOnlyBilling() {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const membershipRows = await prisma.communityMembership.findMany({
    where: {
      status: { in: ['active', 'pending'] },
      community: {
        isActive: true,
        accessModels: { has: 'ONE_TIME' }
      }
    },
    select: { userId: true }
  })

  const userIds = Array.from(new Set(membershipRows.map((row) => row.userId)))

  for (const userId of userIds) {
    const activeSub = await prisma.userSubscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      select: { id: true }
    })
    if (activeSub) continue

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true }
    })
    const userTier = user?.subscriptionTier || 'FREE'

    const lineItems = await buildCommunityLineItems(userId, userTier)
    if (lineItems.length === 0) continue

    const existing = await prisma.paymentTransaction.findFirst({
      where: {
        userId,
        subscriptionId: null,
        status: { in: ['PENDING', 'COMPLETED'] },
        metadata: {
          path: ['created_by'],
          equals: 'community-billing-worker'
        },
        AND: {
          metadata: {
            path: ['invoice_period_start'],
            equals: periodStart.toISOString()
          }
        }
      }
    })

    if (existing) continue

    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)
    if (totalAmount <= 0) continue

    await prisma.paymentTransaction.create({
      data: {
        userId,
        amount: totalAmount,
        currency: 'BRL',
        status: 'PENDING',
        provider: 'MERCADOPAGO',
        metadata: {
          invoice_period_start: periodStart.toISOString(),
          invoice_period_end: periodEnd.toISOString(),
          created_by: 'community-billing-worker',
          description: 'Fatura mensal - Comunidades',
          lineItems,
        },
      },
    })
  }
}

async function main() {
  // Wait for DB to be ready
  async function waitForDb(maxRetries = 20, delayMs = 3000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await prisma.$queryRaw`SELECT 1` as any
        return
      } catch (e) {
        console.warn(`[billing] DB not ready, retrying in ${delayMs}ms (${i + 1}/${maxRetries})`)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
    console.error('[billing] DB not reachable after retries; continuing and relying on next run')
  }

  await waitForDb().catch(() => {})
  // Run immediately on start, then every 24h
  await processSubscriptions().catch(e => console.error('[billing] error:', e))
  await processCommunityOnlyBilling().catch(e => console.error('[billing] community billing error:', e))
  const DAY = 24 * 60 * 60 * 1000
  setInterval(() => {
    processSubscriptions().catch(e => console.error('[billing] error:', e))
    processCommunityOnlyBilling().catch(e => console.error('[billing] community billing error:', e))
  }, DAY)
}

main().catch((e) => {
  console.error('[billing] fatal:', e)
  process.exit(1)
})
