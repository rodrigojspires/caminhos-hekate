#!/usr/bin/env tsx

import { prisma } from '@hekate/database'

function daysDiff(a: Date, b: Date) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.floor((A - B) / (24 * 60 * 60 * 1000))
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
    const amount = billingInterval === 'YEARLY'
      ? Number(sub.plan?.yearlyPrice ?? sub.plan?.monthlyPrice ?? 0)
      : Number(sub.plan?.monthlyPrice ?? 0)

    if (amount > 0) {
      await prisma.paymentTransaction.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          amount,
          currency: 'BRL',
          status: 'PENDING',
          provider: 'MERCADOPAGO', // default provider; payment link is generated on demand
          metadata: {
            invoice_period_start: newStart.toISOString(),
            invoice_period_end: newEnd.toISOString(),
            billing_interval: billingInterval,
            created_by: 'subscription-billing-worker',
          },
        },
      })
      invoicesCreated++
    }
  }

  console.log(`[billing] Done. renewed=${renewed} canceled=${canceled} invoices=${invoicesCreated}`)
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
  const DAY = 24 * 60 * 60 * 1000
  setInterval(() => {
    processSubscriptions().catch(e => console.error('[billing] error:', e))
  }, DAY)
}

main().catch((e) => {
  console.error('[billing] fatal:', e)
  process.exit(1)
})
