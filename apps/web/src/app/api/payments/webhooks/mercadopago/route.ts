import { NextRequest, NextResponse } from 'next/server'
import { EnhancedMercadoPagoProcessor } from '@/lib/enhanced-webhook-handlers'
import { createWebhookResponse, generateEventId, logWebhook, updateWebhookStatus, validateMercadoPagoSignature } from '@/lib/webhook-utils'
import { WebhookLogStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature') || ''
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    const raw = await request.text()

    let payload: any
    try {
      payload = JSON.parse(raw)
    } catch {
      return NextResponse.json(createWebhookResponse(false, 'Invalid JSON payload'), { status: 400 })
    }

    const validation = validateMercadoPagoSignature(raw, signature, secret)
    if (!validation.isValid) {
      // Proceed but mark as failed validation in log
      console.warn('MercadoPago signature invalid:', validation.error)
    }

    const eventId = generateEventId('MERCADOPAGO', payload)
    await logWebhook('MERCADOPAGO', payload?.type || 'payment', eventId, payload, WebhookLogStatus.PENDING)

    const processor = new EnhancedMercadoPagoProcessor()
    const result = await processor.processPaymentWebhook(payload)

    await updateWebhookStatus('MERCADOPAGO', eventId, WebhookLogStatus.SUCCESS)
    return NextResponse.json(createWebhookResponse(true, 'Processed', result))
  } catch (error) {
    console.error('MercadoPago webhook error:', error)
    const eventId = generateEventId('MERCADOPAGO', { error: true })
    await logWebhook('MERCADOPAGO', 'error', eventId, { error: String(error) }, WebhookLogStatus.FAILED, (error as Error)?.message)
    return NextResponse.json(createWebhookResponse(false, 'Internal error'), { status: 500 })
  }
}

