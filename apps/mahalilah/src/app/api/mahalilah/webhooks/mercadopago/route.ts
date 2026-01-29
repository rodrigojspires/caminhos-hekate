import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma, PaymentStatus } from '@hekate/database'
import { MercadoPagoService } from '@/lib/payments/mercadopago'

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

function mapStatus(status: string): 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REFUNDED' {
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
    }

    if (payload.type !== 'payment' || !payload?.data?.id) {
      return NextResponse.json({ ok: true })
    }

    const mp = new MercadoPagoService()
    const payment = await mp.getPayment(String(payload.data.id))
    const status = mapStatus(payment.status)

    const txId = payment.external_reference
    if (!txId) {
      return NextResponse.json({ ok: true })
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: txId }
    })

    if (!transaction) {
      return NextResponse.json({ ok: true })
    }

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        providerStatus: payment.status,
        paymentMethod: payment.payment_method_id || null,
        paidAt: status === 'COMPLETED' ? new Date() : null,
        failedAt: status === 'FAILED' ? new Date() : null,
        refundedAt: status === 'REFUNDED' ? new Date() : null,
        metadata: {
          ...(transaction.metadata as any),
          mercadopago_status: payment.status,
          mercadopago_status_detail: payment.status_detail
        }
      }
    })

    const paymentId = (transaction.metadata as any)?.paymentId
    const paymentRecord = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : transaction.orderId
        ? await prisma.payment.findFirst({ where: { orderId: transaction.orderId }, orderBy: { createdAt: 'desc' } })
        : null

    if (paymentRecord) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: mapPaymentStatus(payment.status),
          mercadoPagoId: String(payment.id),
          mercadoPagoStatus: payment.status,
          paidAt: status === 'COMPLETED' ? new Date() : null,
          metadata: {
            ...(paymentRecord.metadata as any),
            mercadopago_status: payment.status,
            mercadopago_status_detail: payment.status_detail
          }
        }
      })
    }

    if (transaction.orderId) {
      const order = await prisma.order.findUnique({ where: { id: transaction.orderId } })
      if (order) {
        const metadata = (order.metadata as any) || {}
        if (status === 'COMPLETED') {
          const now = new Date()
          const maha = metadata.mahalilah || {}
          const durationDays = maha.durationDays || 30
          const expiresAt = maha.planType === 'SINGLE_SESSION' ? null : new Date(now.getTime() + durationDays * 86400000)

          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              metadata: {
                ...metadata,
                mahalilah: {
                  ...maha,
                  active: true,
                  activatedAt: now.toISOString(),
                  expiresAt: expiresAt ? expiresAt.toISOString() : null
                }
              }
            }
          })
        } else if (status === 'FAILED' || status === 'CANCELED') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: status === 'FAILED' ? 'CANCELLED' : 'CANCELLED'
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
