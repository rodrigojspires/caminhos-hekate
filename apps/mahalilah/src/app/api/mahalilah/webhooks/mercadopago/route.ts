import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  MahaLilahParticipantRole,
  MahaLilahPlanType,
  MahaLilahRoomStatus,
  PaymentStatus,
  SubscriptionStatus,
  prisma
} from '@hekate/database'
import { MercadoPagoService } from '@/lib/payments/mercadopago'
import { generateRoomCode } from '@/lib/mahalilah/room-code'
import { sendRoomCreatedEmail } from '@/lib/email'
import {
  awardMahaGamificationPoints,
  getMahaGamificationPointSettings
} from '@/lib/gamification'

type TxStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REFUNDED'

type MahaSubscriptionMetadata = {
  app?: string
  billingInterval?: 'MONTHLY' | 'YEARLY'
  recurringEnabled?: boolean
  mahalilah?: {
    planType?: 'SUBSCRIPTION' | 'SUBSCRIPTION_LIMITED'
    maxParticipants?: number
    roomsLimit?: number | null
    roomsUsed?: number
    tipsPerPlayer?: number
    summaryLimit?: number
    progressSummaryEveryMoves?: number
    durationDays?: number
    price?: number
    label?: string
  }
}

function validateSignature(body: string, signature: string, secret: string) {
  if (!signature || !secret) return { isValid: false, error: 'missing signature or secret' }
  try {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
    return { isValid }
  } catch (error) {
    return { isValid: false, error: String(error) }
  }
}

function mapStatus(status: string): TxStatus {
  switch (status) {
    case 'approved':
      return 'COMPLETED'
    case 'rejected':
      return 'FAILED'
    case 'cancelled':
      return 'CANCELED'
    case 'refunded':
      return 'REFUNDED'
    default:
      return 'PENDING'
  }
}

function mapPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return PaymentStatus.APPROVED
    case 'rejected':
      return PaymentStatus.REJECTED
    case 'cancelled':
      return PaymentStatus.CANCELLED
    case 'refunded':
      return PaymentStatus.REFUNDED
    default:
      return PaymentStatus.PENDING
  }
}

function parseMahaSubscriptionMetadata(raw: unknown): MahaSubscriptionMetadata | null {
  if (!raw || typeof raw !== 'object') return null
  const metadata = raw as MahaSubscriptionMetadata
  if (metadata.app !== 'mahalilah') return null
  if (!metadata.mahalilah) return null
  return metadata
}

async function ensureUniqueRoomCode(db: {
  mahaLilahRoom: {
    findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null>
  }
}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode()
    const exists = await db.mahaLilahRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Não foi possível gerar um código único para sala automática.')
}

function buildRenewalLabel(
  planType: string | undefined,
  fallbackLabel: string | undefined,
) {
  if (fallbackLabel) return fallbackLabel
  if (planType === 'SUBSCRIPTION_LIMITED') return 'Assinatura Maha Lilah (limitada)'
  return 'Assinatura Maha Lilah (ilimitada)'
}

async function createRenewalInvoiceForSubscription(params: {
  subscriptionId: string
  userId: string
  transactionId: string
  amount: number
  label: string
  planType: 'SUBSCRIPTION' | 'SUBSCRIPTION_LIMITED'
}) {
  const existingPending = await prisma.paymentTransaction.findMany({
    where: {
      subscriptionId: params.subscriptionId,
      status: 'PENDING'
    },
    orderBy: { createdAt: 'desc' },
    take: 12
  })

  const existingForSource = existingPending.find((tx) => {
    const metadata = (tx.metadata as any) || {}
    return metadata?.sourceTransactionId === params.transactionId
  })

  if (existingForSource) {
    return existingForSource
  }

  const renewalTx = await prisma.paymentTransaction.create({
    data: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      amount: params.amount,
      currency: 'BRL',
      provider: 'MERCADOPAGO',
      status: 'PENDING',
      metadata: {
        app: 'mahalilah',
        planType: params.planType,
        billingReason: 'RENEWAL',
        sourceTransactionId: params.transactionId,
        lineItems: [{ label: params.label, amount: params.amount }]
      }
    }
  })

  const baseUrl = process.env.NEXT_PUBLIC_MAHALILAH_URL || process.env.NEXTAUTH_URL || 'https://mahalilahonline.com.br'
  const mp = new MercadoPagoService()
  const preference = await mp.createPreference({
    title: params.label,
    unitPrice: params.amount,
    externalReference: renewalTx.id,
    notificationUrl: `${baseUrl}/api/mahalilah/webhooks/mercadopago`,
    backUrls: {
      success: `${baseUrl}/checkout?status=success&subscription=${params.subscriptionId}`,
      failure: `${baseUrl}/checkout?status=failure&subscription=${params.subscriptionId}`,
      pending: `${baseUrl}/checkout?status=pending&subscription=${params.subscriptionId}`
    },
    metadata: {
      app: 'mahalilah',
      subscriptionId: params.subscriptionId,
      transactionId: renewalTx.id,
      sourceTransactionId: params.transactionId,
      planType: params.planType
    }
  })

  return prisma.paymentTransaction.update({
    where: { id: renewalTx.id },
    data: {
      providerPaymentId: String(preference.id),
      metadata: {
        ...((renewalTx.metadata as any) || {}),
        preferenceId: String(preference.id),
        invoiceUrl: preference.init_point || null,
        paymentLink: preference.init_point || null
      }
    }
  })
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-signature') || ''
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    const raw = await request.text()

    let payload: any
    try {
      payload = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    const validation = validateSignature(raw, signature, secret)
    if (secret && !validation.isValid) {
      console.warn('Assinatura MercadoPago inválida', validation.error)
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    if (payload.type !== 'payment' || !payload?.data?.id) {
      return NextResponse.json({ ok: true })
    }

    const mp = new MercadoPagoService()
    const payment = await mp.getPayment(String(payload.data.id))
    const providerStatus = payment.status || ''
    const status = mapStatus(providerStatus)

    const txId = payment.external_reference
    if (!txId) {
      return NextResponse.json({ ok: true })
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: txId },
      include: {
        subscription: true
      }
    })

    if (!transaction) {
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    let pointSettingsCache:
      | Awaited<ReturnType<typeof getMahaGamificationPointSettings>>
      | null = null
    const loadPointSettings = async () => {
      if (pointSettingsCache) return pointSettingsCache
      pointSettingsCache = await getMahaGamificationPointSettings()
      return pointSettingsCache
    }
    const transactionMetadata = (transaction.metadata as any) || {}
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        providerStatus: payment.status,
        paymentMethod: payment.payment_method_id || null,
        paidAt: status === 'COMPLETED' ? now : null,
        failedAt: status === 'FAILED' ? now : null,
        refundedAt: status === 'REFUNDED' ? now : null,
        metadata: {
          ...transactionMetadata,
          mercadopago_status: payment.status,
          mercadopago_status_detail: payment.status_detail
        }
      }
    })

    const paymentId = transactionMetadata?.paymentId
    const paymentRecord = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : transaction.orderId
        ? await prisma.payment.findFirst({
            where: { orderId: transaction.orderId },
            orderBy: { createdAt: 'desc' }
          })
        : null

    if (paymentRecord) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: mapPaymentStatus(providerStatus),
          mercadoPagoId: String(payment.id),
          mercadoPagoStatus: providerStatus,
          paidAt: status === 'COMPLETED' ? now : null,
          metadata: {
            ...(paymentRecord.metadata as any),
            mercadopago_status: payment.status,
            mercadopago_status_detail: payment.status_detail
          }
        }
      })
    }

    if (updatedTransaction.subscriptionId && transaction.subscription) {
      const subscriptionMetadata = parseMahaSubscriptionMetadata(
        transaction.subscription.metadata,
      )

      if (subscriptionMetadata?.mahalilah?.planType) {
        if (status === 'COMPLETED') {
          const durationDays = Number(subscriptionMetadata.mahalilah.durationDays || 30)
          const periodStart = now
          const periodEnd = new Date(
            periodStart.getTime() + durationDays * 86400000,
          )

          const resetRoomsUsedMetadata: MahaSubscriptionMetadata = {
            ...subscriptionMetadata,
            mahalilah: {
              ...subscriptionMetadata.mahalilah,
              roomsUsed: 0
            }
          }

          await prisma.userSubscription.update({
            where: { id: transaction.subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              metadata: resetRoomsUsedMetadata as any
            }
          })

          const renewalAlreadyGenerated = Boolean(
            transactionMetadata?.renewalInvoiceId ||
              transactionMetadata?.renewalGeneratedAt,
          )

          if (!renewalAlreadyGenerated) {
            const renewalAmount = Number(
              subscriptionMetadata.mahalilah.price ||
                updatedTransaction.amount ||
                0,
            )
            if (renewalAmount > 0) {
              const renewalInvoice = await createRenewalInvoiceForSubscription({
                subscriptionId: transaction.subscription.id,
                userId: transaction.subscription.userId,
                transactionId: transaction.id,
                amount: renewalAmount,
                label: buildRenewalLabel(
                  subscriptionMetadata.mahalilah.planType,
                  subscriptionMetadata.mahalilah.label,
                ),
                planType: subscriptionMetadata.mahalilah.planType
              })

              await prisma.paymentTransaction.update({
                where: { id: updatedTransaction.id },
                data: {
                  metadata: {
                    ...(updatedTransaction.metadata as any),
                    renewalInvoiceId: renewalInvoice.id,
                    renewalGeneratedAt: now.toISOString()
                  }
                }
              })
            }
          }

          try {
            const pointSettings = await loadPointSettings()
            const billingReason = String(transactionMetadata?.billingReason || 'INITIAL')
            const isRenewal = billingReason === 'RENEWAL'
            const pointsToAward = isRenewal
              ? pointSettings.subscriptionRenewalPoints
              : pointSettings.subscriptionSignupPoints

            await awardMahaGamificationPoints({
              userId: transaction.subscription.userId,
              points: pointsToAward,
              eventType: isRenewal
                ? 'MAHALILAH_SUBSCRIPTION_RENEWAL'
                : 'MAHALILAH_SUBSCRIPTION_SIGNUP',
              reasonLabel: isRenewal
                ? 'Renovação de assinatura Maha Lilah'
                : 'Assinatura Maha Lilah',
              uniqueKey: isRenewal
                ? `mahalilah_subscription_renewal_${updatedTransaction.id}`
                : `mahalilah_subscription_signup_${transaction.subscription.id}`,
              metadata: {
                subscriptionId: transaction.subscription.id,
                billingReason,
                transactionId: updatedTransaction.id,
                planType: subscriptionMetadata.mahalilah.planType
              }
            })
          } catch (error) {
            console.error('Falha ao conceder pontos de assinatura Maha Lilah:', error)
          }
        } else if (status === 'FAILED' || status === 'CANCELED') {
          await prisma.userSubscription.update({
            where: { id: transaction.subscription.id },
            data: {
              status: SubscriptionStatus.PAST_DUE
            }
          })
        } else if (status === 'REFUNDED') {
          await prisma.userSubscription.update({
            where: { id: transaction.subscription.id },
            data: {
              status: SubscriptionStatus.CANCELLED,
              canceledAt: now
            }
          })
        }
      }
    }

    if (transaction.orderId) {
      const order = await prisma.order.findUnique({ where: { id: transaction.orderId } })
      if (order) {
        const metadata = (order.metadata as any) || {}
        if (status === 'COMPLETED') {
          const maha = metadata.mahalilah || {}
          const durationDays = maha.durationDays || 30
          const expiresAt = maha.planType === 'SINGLE_SESSION' ? null : new Date(now.getTime() + durationDays * 86400000)
          const shouldAutoCreateSingleSessionRoom =
            maha.planType === 'SINGLE_SESSION' && !maha.autoRoomId && Boolean(order.userId)

          const txResult = await prisma.$transaction(async (tx) => {
            const roomByOrder = await tx.mahaLilahRoom.findFirst({
              where: { orderId: order.id },
              select: { id: true, code: true }
            })

            let autoRoom = roomByOrder

            if (shouldAutoCreateSingleSessionRoom && !roomByOrder) {
              const code = await ensureUniqueRoomCode(tx)
              const createdRoom = await tx.mahaLilahRoom.create({
                data: {
                  code,
                  createdByUserId: order.userId!,
                  status: MahaLilahRoomStatus.ACTIVE,
                  maxParticipants: Number(maha.maxParticipants || 4),
                  therapistPlays: true,
                  therapistSoloPlay: false,
                  isTrial: false,
                  planType: MahaLilahPlanType.SINGLE_SESSION,
                  orderId: order.id,
                  consentTextVersion: process.env.MAHALILAH_CONSENT_VERSION || 'v1'
                },
                select: { id: true, code: true }
              })

              await tx.mahaLilahParticipant.create({
                data: {
                  roomId: createdRoom.id,
                  userId: order.userId!,
                  role: MahaLilahParticipantRole.THERAPIST,
                  displayName: order.customerName || null
                }
              })

              await tx.mahaLilahGameState.create({
                data: { roomId: createdRoom.id }
              })

              autoRoom = createdRoom
            }

            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'PAID',
                metadata: {
                  ...metadata,
                  mahalilah: {
                    ...maha,
                    active: true,
                    activatedAt: now.toISOString(),
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    roomsUsed:
                      maha.planType === 'SINGLE_SESSION'
                        ? 1
                        : Number(maha.roomsUsed || 0),
                    autoRoomId: autoRoom?.id || maha.autoRoomId || null,
                    autoRoomCode: autoRoom?.code || maha.autoRoomCode || null,
                    autoRoomCreatedAt:
                      autoRoom && !maha.autoRoomCreatedAt
                        ? now.toISOString()
                        : maha.autoRoomCreatedAt || null
                  }
                }
              }
            })

            return {
              createdRoomForEmail:
                shouldAutoCreateSingleSessionRoom && !roomByOrder ? autoRoom : null
            }
          })

          if (txResult.createdRoomForEmail && order.customerEmail) {
            try {
              await sendRoomCreatedEmail({
                to: order.customerEmail,
                recipientName: order.customerName,
                roomCode: txResult.createdRoomForEmail.code
              })
            } catch (error) {
              console.warn('Falha ao enviar e-mail de sala criada (webhook):', error)
            }
          }

          try {
            if (maha.planType === 'SINGLE_SESSION' && order.userId) {
              const pointSettings = await loadPointSettings()
              await awardMahaGamificationPoints({
                userId: order.userId,
                points: pointSettings.roomPurchasePoints,
                eventType: 'MAHALILAH_ROOM_PURCHASED',
                reasonLabel: 'Compra de sala Maha Lilah',
                uniqueKey: `mahalilah_single_session_purchase_${order.id}`,
                metadata: {
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  planType: maha.planType,
                  transactionId: updatedTransaction.id
                }
              })
            }
          } catch (error) {
            console.error('Falha ao conceder pontos de compra Maha Lilah:', error)
          }
        } else if (status === 'FAILED' || status === 'CANCELED') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED'
            }
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro webhook MercadoPago Maha Lilah:', error)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
