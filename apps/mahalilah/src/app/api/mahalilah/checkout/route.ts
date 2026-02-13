import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, PaymentStatus, ProductType } from '@hekate/database'
import { z } from 'zod'
import { MercadoPagoService } from '@/lib/payments/mercadopago'
import { resolvePlan, type BillingInterval, type PlanType } from '@/lib/mahalilah/plans'

const CheckoutSchema = z.object({
  planType: z.enum(['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED']),
  maxParticipants: z.number().int().min(1).max(12).optional(),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).optional()
})

function generateOrderNumber() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MLH-${ymd}-${rnd}`
}

function getMahaCatalogConfig(planType: PlanType) {
  if (planType === 'SINGLE_SESSION') {
    return {
      productSlug: 'mahalilah-sessao-avulsa',
      productName: 'Maha Lilah - Sessao avulsa',
      variantSku: 'MAHA-SINGLE-SESSION',
      variantName: 'Sessao avulsa'
    }
  }

  if (planType === 'SUBSCRIPTION_LIMITED') {
    return {
      productSlug: 'mahalilah-assinatura-limitada',
      productName: 'Maha Lilah - Assinatura limitada',
      variantSku: 'MAHA-SUBSCRIPTION-LIMITED',
      variantName: 'Plano limitado'
    }
  }

  return {
    productSlug: 'mahalilah-assinatura-ilimitada',
    productName: 'Maha Lilah - Assinatura ilimitada',
    variantSku: 'MAHA-SUBSCRIPTION-UNLIMITED',
    variantName: 'Plano ilimitado'
  }
}

async function ensureMahaCheckoutVariant(params: {
  planType: PlanType
  variantLabel: string
  amount: number
}) {
  const config = getMahaCatalogConfig(params.planType)

  let product = await prisma.product.findUnique({ where: { slug: config.productSlug } })

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: config.productName,
        slug: config.productSlug,
        description: config.productName,
        shortDescription: config.productName,
        type: ProductType.DIGITAL,
        images: [],
        active: true
      }
    })
  } else if (!product.active || product.name !== config.productName) {
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: config.productName,
        description: product.description || config.productName,
        shortDescription: product.shortDescription || config.productName,
        active: true
      }
    })
  }

  let variant = await prisma.productVariant.findUnique({ where: { sku: config.variantSku } })

  if (!variant) {
    variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: config.variantSku,
        name: params.variantLabel || config.variantName,
        price: params.amount,
        stock: 0,
        active: true
      }
    })
  } else {
    const nextName = params.variantLabel || variant.name || config.variantName
    if (!variant.active || Number(variant.price) !== params.amount || variant.name !== nextName) {
      variant = await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          productId: product.id,
          name: nextName,
          price: params.amount,
          active: true
        }
      })
    }
  }

  return { product, variant }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = CheckoutSchema.parse(payload)
    const planType = data.planType as PlanType
    const billingInterval = (data.billingInterval || 'MONTHLY') as BillingInterval

    const plan = await resolvePlan(planType, data.maxParticipants, billingInterval)
    const baseUrl = process.env.NEXT_PUBLIC_MAHALILAH_URL || process.env.NEXTAUTH_URL || 'https://mahalilahonline.com.br'

    const checkoutVariant = await ensureMahaCheckoutVariant({
      planType,
      variantLabel: plan.label,
      amount: plan.price
    })

    if (planType === 'SINGLE_SESSION') {
      const orderNumber = generateOrderNumber()

      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          status: 'PENDING',
          subtotal: plan.price,
          shipping: 0,
          discount: 0,
          total: plan.price,
          customerEmail: session.user.email,
          customerName: session.user.name || session.user.email,
          metadata: {
            app: 'mahalilah',
            mahalilah: {
              planId: plan.planId,
              planType,
              maxParticipants: plan.maxParticipants,
              roomsLimit: plan.roomsLimit,
              tipsPerPlayer: plan.tipsPerPlayer,
              summaryLimit: plan.summaryLimit,
              progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
              durationDays: plan.durationDays,
              roomsUsed: 0,
              active: false,
              pricing: {
                mode: plan.pricingTier?.pricingMode || null,
                participantsFrom: plan.pricingTier?.participantsFrom ?? null,
                participantsTo: plan.pricingTier?.participantsTo ?? null,
                unitPrice: plan.pricingTier?.unitPrice ?? null,
                fixedPrice: plan.pricingTier?.fixedPrice ?? null,
                total: plan.price
              }
            }
          },
          items: {
            create: [
              {
                productId: checkoutVariant.product.id,
                variantId: checkoutVariant.variant.id,
                name: plan.label,
                price: plan.price,
                quantity: 1,
                total: plan.price,
                metadata: {
                  app: 'mahalilah',
                  planType,
                  planId: plan.planId,
                  billingInterval: plan.billingInterval
                }
              }
            ]
          }
        }
      })

      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: plan.price,
          currency: 'BRL',
          status: PaymentStatus.PENDING,
          method: 'MERCADOPAGO',
          metadata: {
            app: 'mahalilah',
            planType
          }
        }
      })

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: session.user.id,
          orderId: order.id,
          amount: plan.price,
          currency: 'BRL',
          provider: 'MERCADOPAGO',
          status: 'PENDING',
          metadata: {
            app: 'mahalilah',
            billingInterval: plan.billingInterval,
            planType,
            maxParticipants: plan.maxParticipants,
            planId: plan.planId,
            pricing: {
              mode: plan.pricingTier?.pricingMode || null,
              participantsFrom: plan.pricingTier?.participantsFrom ?? null,
              participantsTo: plan.pricingTier?.participantsTo ?? null,
              unitPrice: plan.pricingTier?.unitPrice ?? null,
              fixedPrice: plan.pricingTier?.fixedPrice ?? null,
              total: plan.price
            },
            paymentId: payment.id
          }
        }
      })

      const mp = new MercadoPagoService()
      const preference = await mp.createPreference({
        title: plan.label,
        unitPrice: plan.price,
        externalReference: transaction.id,
        notificationUrl: `${baseUrl}/api/mahalilah/webhooks/mercadopago`,
        backUrls: {
          success: `${baseUrl}/checkout?status=success&order=${order.id}`,
          failure: `${baseUrl}/checkout?status=failure&order=${order.id}`,
          pending: `${baseUrl}/checkout?status=pending&order=${order.id}`
        },
        metadata: {
          transactionId: transaction.id,
          orderId: order.id,
          planType
        }
      })

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { providerPaymentId: String(preference.id) }
      })

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentUrl: preference.init_point
      })
    }

    const subscriptionPlanId = plan.subscriptionPlanId
    if (!subscriptionPlanId) {
      return NextResponse.json(
        { error: 'Plano de assinatura Maha Lilah não configurado.' },
        { status: 500 }
      )
    }

    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'ACTIVE', 'TRIALING', 'PAST_DUE'] }
      },
      orderBy: { createdAt: 'desc' }
    })

    const hasMahaSubscription = activeSubscriptions.some((subscription) => {
      const metadata = (subscription.metadata as any) || {}
      return metadata.app === 'mahalilah'
    })

    if (hasMahaSubscription) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura Maha Lilah ativa ou pendente.' },
        { status: 409 }
      )
    }

    const orderNumber = generateOrderNumber()
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: 'PENDING',
        subtotal: plan.price,
        shipping: 0,
        discount: 0,
        total: plan.price,
        customerEmail: session.user.email,
        customerName: session.user.name || session.user.email,
        metadata: {
          app: 'mahalilah',
          mahalilah: {
            planId: plan.planId,
            planType,
            maxParticipants: plan.maxParticipants,
            roomsLimit: plan.roomsLimit,
            roomsUsed: 0,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
            durationDays: plan.durationDays,
            active: false,
            billingInterval: plan.billingInterval,
            price: plan.price,
            label: plan.label
          }
        },
        items: {
          create: [
            {
              productId: checkoutVariant.product.id,
              variantId: checkoutVariant.variant.id,
              name: plan.label,
              price: plan.price,
              quantity: 1,
              total: plan.price,
              metadata: {
                app: 'mahalilah',
                planType,
                planId: plan.planId,
                billingInterval: plan.billingInterval,
                isSubscription: true
              }
            }
          ]
        }
      }
    })

    const now = new Date()
    const periodEnd = new Date(now.getTime() + plan.durationDays * 86400000)
    const subscription = await prisma.userSubscription.create({
      data: {
        userId: session.user.id,
        planId: subscriptionPlanId,
        status: 'PENDING',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: {
          app: 'mahalilah',
          billingInterval: plan.billingInterval,
          recurringEnabled: true,
          mahalilah: {
            planId: plan.planId,
            planType,
            maxParticipants: plan.maxParticipants,
            roomsLimit: plan.roomsLimit,
            roomsUsed: 0,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
            durationDays: plan.durationDays,
            price: plan.price,
            label: plan.label,
            billingInterval: plan.billingInterval
          }
        }
      }
    })

    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        subscriptionId: subscription.id,
        orderId: order.id,
        amount: plan.price,
        currency: 'BRL',
        provider: 'MERCADOPAGO',
        status: 'PENDING',
        metadata: {
          app: 'mahalilah',
          billingInterval: plan.billingInterval,
          planType,
          planId: plan.planId,
          billingReason: 'INITIAL',
          lineItems: [{ label: plan.label, amount: plan.price }],
          pricing: {
            total: plan.price
          },
          subscriptionId: subscription.id
        }
      }
    })

    const mp = new MercadoPagoService()
    const preference = await mp.createPreference({
      title: plan.label,
      unitPrice: plan.price,
      externalReference: transaction.id,
      notificationUrl: `${baseUrl}/api/mahalilah/webhooks/mercadopago`,
      backUrls: {
        success: `${baseUrl}/checkout?status=success&subscription=${subscription.id}`,
        failure: `${baseUrl}/checkout?status=failure&subscription=${subscription.id}`,
        pending: `${baseUrl}/checkout?status=pending&subscription=${subscription.id}`
      },
      metadata: {
        app: 'mahalilah',
        transactionId: transaction.id,
        subscriptionId: subscription.id,
        orderId: order.id,
        planType
      }
    })

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        providerPaymentId: String(preference.id),
        metadata: {
          ...((transaction.metadata as any) || {}),
          preferenceId: String(preference.id),
          paymentLink: preference.init_point || null
        }
      }
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: preference.init_point
    })
  } catch (error) {
    console.error('Erro ao criar checkout Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
