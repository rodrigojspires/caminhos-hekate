import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getCartFromCookie, computeTotals, clearCart } from '@/lib/shop/cart'
import { calculateShipping } from '@/lib/shop/shipping'
import { MercadoPagoService } from '@/lib/payments/mercadopago'

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
      shippingAddress,
      notes,
      enrollCourseIds,
    } = body as {
      customer: { name: string; email: string; phone?: string; document?: string; userId?: string | null }
      billingAddress?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string }
      shippingAddress?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string }
      notes?: string
      enrollCourseIds?: string[]
    }

    if (!customer?.name || !customer?.email) {
      return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 })
    }

    const cart = getCartFromCookie()
    if (!cart.items.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })

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

    const totals = await computeTotals(cart)

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

    if (itemDetails.length === 0) {
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

    const itemsToCreate = itemDetails.map(({ item, variant }) => {
      const lineTotal = Number(variant.price) * item.quantity
      return {
        productId: variant.productId,
        variantId: variant.id,
        name: `${variant.product.name}${variant.name ? ` - ${variant.name}` : ''}`,
        price: variant.price,
        quantity: item.quantity,
        total: lineTotal,
      }
    })

    const metadata: Record<string, any> = {}
    if (enrollCourseIds && Array.isArray(enrollCourseIds) && enrollCourseIds.length > 0) {
      metadata.enrollCourseIds = enrollCourseIds
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

    const { order } = await prisma.$transaction(async (tx) => {
      const billingRecord = billingAddress
        ? await tx.address.create({
            data: {
              userId: customer.userId || undefined,
              name: 'Cobrança',
              street: billingAddress.street,
              number: billingAddress.number,
              complement: billingAddress.complement,
              neighborhood: billingAddress.neighborhood,
              city: billingAddress.city,
              state: billingAddress.state,
              zipCode: billingAddress.zipCode,
              country: 'BR',
            },
          })
        : null

      const shippingRecord = shippingAddress
        ? await tx.address.create({
            data: {
              userId: customer.userId || undefined,
              name: 'Entrega',
              street: shippingAddress.street,
              number: shippingAddress.number,
              complement: shippingAddress.complement,
              neighborhood: shippingAddress.neighborhood,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zipCode: shippingAddress.zipCode,
              country: 'BR',
            },
          })
        : null

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
          billingAddressId: billingRecord?.id || null,
          shippingAddressId: shippingRecord?.id || null,
          notes: notes || null,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          couponCode: couponRecord?.code ?? null,
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
