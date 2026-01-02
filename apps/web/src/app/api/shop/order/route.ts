import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { Prisma, ProductType } from '@prisma/client'
import { getCartFromCookie, computeTotals, clearCart } from '@/lib/shop/cart'
import { calculateShipping } from '@/lib/shop/shipping'
import { MercadoPagoService } from '@/lib/payments/mercadopago'
import { notifyUsers } from '@/lib/notifications'
import { ORDER_STATUS_LABELS } from '@/lib/shop/orderStatusNotifications'
import { handleOrderCreated } from '@/lib/gamification/orderGamification'

function generateOrderNumber() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `HKT-${ymd}-${rnd}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer,
      billingAddress,
      billingAddressId,
      shippingAddress,
      shippingAddressId,
      notes,
      enrollCourseIds,
      eventIds,
      communityIds,
    } = body as {
      customer: { name: string; email: string; phone?: string; document?: string; userId?: string | null }
      billingAddress?: { street: string; number: string; complement?: string | null; neighborhood: string; city: string; state: string; zipCode: string }
      billingAddressId?: string | null
      shippingAddress?: { street: string; number: string; complement?: string | null; neighborhood: string; city: string; state: string; zipCode: string }
      shippingAddressId?: string | null
      notes?: string
      enrollCourseIds?: string[]
      eventIds?: string[]
      communityIds?: string[]
    }

    if (!customer?.name || !customer?.email) {
      return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 })
    }

    const cart = getCartFromCookie()
    const hasCartItems = cart.items.length > 0
    const uniqueEventIds = Array.isArray(eventIds) ? Array.from(new Set(eventIds)) : []
    const uniqueCommunityIds = Array.isArray(communityIds) ? Array.from(new Set(communityIds)) : []
    if (!hasCartItems && uniqueEventIds.length === 0 && uniqueCommunityIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum item no checkout' }, { status: 400 })
    }

    if (cart.shipping?.cep) {
      try {
        cart.shipping = await calculateShipping(
          cart.shipping.cep,
          cart.items,
          cart.shipping.serviceId,
        )
      } catch (error) {
        console.error('Erro ao recalcular frete antes do pedido:', error)
      }
    }

    // Eventos pagos passados via query do checkout
    const events = uniqueEventIds.length
      ? await prisma.event.findMany({
          where: {
            id: { in: uniqueEventIds },
            status: 'PUBLISHED',
            accessType: 'PAID'
          },
          select: {
            id: true,
            title: true,
            description: true,
            price: true
          }
        })
      : []

    const validEvents = events.filter((ev) => ev.price != null && Number(ev.price) > 0)

    const communities = uniqueCommunityIds.length
      ? await prisma.community.findMany({
          where: {
            id: { in: uniqueCommunityIds },
            isActive: true,
            accessModels: { has: 'ONE_TIME' }
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            slug: true
          }
        })
      : []

    const validCommunities = communities.filter((community) => community.price != null && Number(community.price) > 0)

    if (uniqueEventIds.length && validEvents.length === 0) {
      return NextResponse.json({ error: 'Eventos inválidos ou sem preço' }, { status: 400 })
    }
    if (uniqueCommunityIds.length && validCommunities.length === 0) {
      return NextResponse.json({ error: 'Comunidades inválidas ou sem preço' }, { status: 400 })
    }

    const eventSubtotal = validEvents.reduce((sum, ev) => sum + Number(ev.price), 0)
    const communitySubtotal = validCommunities.reduce((sum, community) => sum + Number(community.price), 0)

    const totals = await computeTotals(cart)
    totals.subtotal += eventSubtotal + communitySubtotal
    totals.total += eventSubtotal + communitySubtotal

    if (totals.total <= 0) {
      return NextResponse.json({ error: 'Total do pedido inválido.' }, { status: 400 })
    }

    const itemDetails = await Promise.all(
      cart.items.map(async (i) => {
        const variant = await prisma.productVariant.findUnique({
          include: { product: true },
          where: { id: i.variantId },
        })
        if (!variant) {
          throw new Error('Variante inválida')
        }
        return { item: i, variant }
      })
    )

    if (itemDetails.length === 0 && validEvents.length === 0) {
      return NextResponse.json({ error: 'Carrinho inválido' }, { status: 400 })
    }

    const hasPhysicalItems = itemDetails.some(({ variant }) => variant.product.type === 'PHYSICAL')

    if (hasPhysicalItems) {
      if (!cart.shipping?.serviceId) {
        return NextResponse.json({ error: 'Calcule e selecione o frete antes de finalizar a compra.' }, { status: 400 })
      }
    }

    let couponRecord: { id: string; code: string } | null = null
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: cart.couponCode } })
      const now = new Date()
      if (
        coupon &&
        coupon.active &&
        coupon.validFrom <= now &&
        coupon.validUntil >= now
      ) {
        if (coupon.usageLimit != null) {
          const usageCount = await prisma.couponUsage.count({ where: { couponId: coupon.id } })
          if (usageCount >= coupon.usageLimit) {
            return NextResponse.json({ error: 'Cupom atingiu o limite de uso.' }, { status: 400 })
          }
        }
        couponRecord = { id: coupon.id, code: coupon.code }
      } else {
        return NextResponse.json({ error: 'Cupom inválido.' }, { status: 400 })
      }
    }

    if (couponRecord && totals.discount <= 0) {
      return NextResponse.json({ error: 'Cupom não se aplica ao carrinho atual.' }, { status: 400 })
    }

    const orderNumber = generateOrderNumber()

    const metadata: Record<string, any> = {}
    if (enrollCourseIds && Array.isArray(enrollCourseIds) && enrollCourseIds.length > 0) {
      metadata.enrollCourseIds = enrollCourseIds
    }
    if (uniqueEventIds.length > 0) {
      metadata.eventIds = uniqueEventIds
    }
    if (uniqueCommunityIds.length > 0) {
      metadata.communityIds = uniqueCommunityIds
    }
    if (cart.shipping?.serviceId) {
      metadata.shippingOption = {
        serviceId: cart.shipping.serviceId,
        service: cart.shipping.service,
        carrier: cart.shipping.carrier ?? null,
        deliveryDays: cart.shipping.deliveryDays ?? null,
        price: cart.shipping.price,
      }
    }
    if (couponRecord) {
      metadata.couponCode = couponRecord.code
    }

    const findMatchingAddress = async (
      tx: Prisma.TransactionClient,
      userId: string | undefined | null,
      payload?: { street: string; number: string; complement?: string | null; neighborhood: string; city: string; state: string; zipCode: string },
    ) => {
      if (!userId || !payload) return null
      return tx.address.findFirst({
        where: {
          userId,
          street: payload.street,
          number: payload.number,
          neighborhood: payload.neighborhood,
          city: payload.city,
          state: payload.state,
          zipCode: payload.zipCode,
        },
      })
    }

    const ensureEventProductAndVariant = async (
      tx: Prisma.TransactionClient,
      event: { id: string; title: string; description: string | null; price: any }
    ) => {
      const slug = `evento-${event.id}`
      const sku = `EVENT-${event.id}`

      let product = await tx.product.findUnique({ where: { slug } })
      if (!product) {
        product = await tx.product.create({
          data: {
            name: `Evento: ${event.title}`,
            slug,
            description: event.description || `Evento ${event.title}`,
            shortDescription: event.description?.slice(0, 180) ?? null,
            type: ProductType.DIGITAL,
            images: [],
            active: true
          }
        })
      }

      let variant = await tx.productVariant.findUnique({ where: { sku } })
      if (!variant) {
        variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku,
            name: 'Ingresso',
            price: new Prisma.Decimal(event.price),
            stock: 0,
            active: true
          }
        })
      }

      return { product, variant }
    }

    const ensureCommunityProductAndVariant = async (
      tx: Prisma.TransactionClient,
      community: { id: string; name: string; description: string | null; price: any; slug: string }
    ) => {
      const slug = `comunidade-${community.slug}`
      const sku = `COMMUNITY-${community.id}`

      let product = await tx.product.findUnique({ where: { slug } })
      if (!product) {
        product = await tx.product.create({
          data: {
            name: `Comunidade: ${community.name}`,
            slug,
            description: community.description || `Comunidade ${community.name}`,
            shortDescription: community.description?.slice(0, 180) ?? null,
            type: ProductType.DIGITAL,
            images: [],
            active: true
          }
        })
      }

      let variant = await tx.productVariant.findUnique({ where: { sku } })
      if (!variant) {
        variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku,
            name: 'Acesso avulso',
            price: new Prisma.Decimal(community.price),
            stock: 0,
            active: true
          }
        })
      }

      return { product, variant }
    }

    const { order } = await prisma.$transaction(async (tx) => {
      const ensureAddress = async (
        providedId: string | null | undefined,
        fallbackPayload?: { street: string; number: string; complement?: string | null; neighborhood: string; city: string; state: string; zipCode: string },
        defaultName?: string,
      ) => {
        if (customer.userId) {
          if (providedId) {
            const existing = await tx.address.findFirst({
              where: { id: providedId, userId: customer.userId },
            })
            if (existing) return existing
          }

          const matched = await findMatchingAddress(tx, customer.userId, fallbackPayload)
          if (matched) return matched
        }

        if (fallbackPayload) {
          return tx.address.create({
            data: {
              userId: customer.userId || undefined,
              name: defaultName ?? fallbackPayload.street,
              street: fallbackPayload.street,
              number: fallbackPayload.number,
              complement: fallbackPayload.complement,
              neighborhood: fallbackPayload.neighborhood,
              city: fallbackPayload.city,
              state: fallbackPayload.state,
              zipCode: fallbackPayload.zipCode,
              country: 'BR',
            },
          })
        }

        return null
      }

      const billingRecord = await ensureAddress(billingAddressId, billingAddress, 'Cobrança')
      const shippingRecord = await ensureAddress(shippingAddressId, shippingAddress, 'Entrega')

      const eventVariants = await Promise.all(
        validEvents.map((ev) => ensureEventProductAndVariant(tx, ev))
      )
      const communityVariants = await Promise.all(
        validCommunities.map((community) => ensureCommunityProductAndVariant(tx, community))
      )

      const itemsToCreate = [
        ...itemDetails.map(({ item, variant }) => {
          const lineTotal = Number(variant.price) * item.quantity
          return {
            productId: variant.productId,
            variantId: variant.id,
            name: `${variant.product.name}${variant.name ? ` - ${variant.name}` : ''}`,
            price: variant.price,
            quantity: item.quantity,
            total: lineTotal,
          }
        }),
        ...validEvents.map((ev, idx) => {
          const variant = eventVariants[idx].variant
          const price = new Prisma.Decimal(ev.price)
          return {
            productId: variant.productId,
            variantId: variant.id,
            name: `Evento: ${ev.title}`,
            price,
            quantity: 1,
            total: price,
            metadata: {
              eventId: ev.id,
              eventTitle: ev.title
            }
          }
        }),
        ...validCommunities.map((community, idx) => {
          const variant = communityVariants[idx].variant
          const price = new Prisma.Decimal(community.price)
          return {
            productId: variant.productId,
            variantId: variant.id,
            name: `Comunidade: ${community.name}`,
            price,
            quantity: 1,
            total: price,
            metadata: {
              communityId: community.id,
              communityName: community.name
            }
          }
        })
      ]

      const orderData: any = {
        orderNumber,
        status: 'PENDING',
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        discount: totals.discount,
        total: totals.total,
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone || null,
        customerDocument: customer.document || null,
        notes: notes || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        items: {
          create: itemsToCreate,
        },
      }

      if (customer.userId) {
        orderData.user = {
          connect: {
            id: customer.userId,
          },
        }
      }

      if (billingRecord) {
        orderData.billingAddress = {
          connect: {
            id: billingRecord.id,
          },
        }
      }

      if (shippingRecord) {
        orderData.shippingAddress = {
          connect: {
            id: shippingRecord.id,
          },
        }
      }

      const createdOrder = await tx.order.create({
        data: orderData,
        include: { items: true },
      })

      if (couponRecord && totals.discount > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: couponRecord.id,
            orderId: createdOrder.id,
            discount: totals.discount,
          },
        })
        await tx.coupon.update({
          where: { id: couponRecord.id },
          data: { usageCount: { increment: 1 } },
        })
      }

      return { order: createdOrder }
    })

    const gamificationResult = await handleOrderCreated({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: customer.userId,
      totalAmount: Number(order.total),
    })

    // E-mail: pedido criado
    try {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        toEmail: customer.email,
        subject: `Pedido criado • ${order.orderNumber}`,
        htmlContent: `<h2>Pedido criado</h2><p>Recebemos seu pedido <strong>${order.orderNumber}</strong>. Assim que o pagamento for confirmado, enviaremos as próximas instruções.</p>`,
        textContent: `Pedido criado ${order.orderNumber}. Aguarde a confirmação do pagamento.`,
        priority: 'NORMAL',
      } as any)
    } catch (e) {
      console.error('Erro ao enviar e-mail de pedido criado:', e)
    }

    if (customer.userId) {
      try {
        let content = `Recebemos seu pedido e ele está em "${ORDER_STATUS_LABELS.PENDING}". Avisaremos sobre novas atualizações aqui mesmo.`
        if (gamificationResult?.pointsAwarded) {
          content += ` Você ganhou +${gamificationResult.pointsAwarded} pontos ao iniciar seu pedido.`
        }

        await notifyUsers({
          userId: customer.userId,
          type: 'ORDER_STATUS',
          title: `Pedido ${order.orderNumber} criado`,
          content,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: 'PENDING',
            trackingInfo: null,
            pointsAwarded: gamificationResult?.pointsAwarded ?? 0,
          },
        })
      } catch (error) {
        console.error('Erro ao criar notificação inicial do pedido:', error)
      }
    }

    // Create payment preference on MercadoPago
    const mp = new MercadoPagoService()
    const pref = await mp.createOrderPayment({
      orderId: order.id,
      userId: customer.userId || null,
      totalAmount: totals.total,
      description: `Pedido ${order.orderNumber}`,
      shippingAmount: totals.shipping,
      discountAmount: totals.discount,
      couponCode: cart.couponCode || null,
      items: order.items.map((it) => ({
        id: it.productId,
        title: it.name,
        quantity: it.quantity,
        unit_price: Number(it.price),
      })),
    })

    // Clear cart after creating order
    clearCart()

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: pref.paymentUrl,
    })
  } catch (error) {
    console.error('POST /api/shop/order error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Ensure this route is always dynamic and not statically evaluated at build time
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export async function HEAD() {
  return NextResponse.json(null, { status: 405 })
}
