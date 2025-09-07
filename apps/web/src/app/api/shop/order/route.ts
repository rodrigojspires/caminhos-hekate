import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getCartFromCookie, computeTotals, clearCart } from '@/lib/shop/cart'
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
    } = body as {
      customer: { name: string; email: string; phone?: string; document?: string; userId?: string | null }
      billingAddress?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string }
      shippingAddress?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string }
      notes?: string
    }

    if (!customer?.name || !customer?.email) {
      return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 })
    }

    const cart = getCartFromCookie()
    if (!cart.items.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
    const totals = await computeTotals(cart)

    // Create addresses if provided
    const [billing, shipping] = await Promise.all([
      billingAddress
        ? prisma.address.create({
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
              type: 'BILLING' as any,
            },
          })
        : null,
      shippingAddress
        ? prisma.address.create({
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
              type: 'SHIPPING' as any,
            },
          })
        : null,
    ])

    const orderNumber = generateOrderNumber()

    // Create order and items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.userId || undefined,
        status: 'PENDING',
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        discount: totals.discount,
        total: totals.total,
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone || null,
        customerDocument: customer.document || null,
        billingAddressId: billing?.id || null,
        shippingAddressId: shipping?.id || null,
        notes: notes || null,
        items: {
          create: await Promise.all(
            cart.items.map(async (i) => {
              const variant = await prisma.productVariant.findUnique({ include: { product: true }, where: { id: i.variantId } })
              if (!variant) throw new Error('Variante inválida')
              const lineTotal = Number(variant.price) * i.quantity
              return {
                productId: variant.productId,
                variantId: variant.id,
                name: `${variant.product.name} - ${variant.name}`,
                price: variant.price,
                quantity: i.quantity,
                total: lineTotal,
              }
            })
          ),
        },
      },
      include: { items: true },
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
