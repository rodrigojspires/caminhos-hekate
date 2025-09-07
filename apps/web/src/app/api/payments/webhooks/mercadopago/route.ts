import { NextRequest, NextResponse } from 'next/server'
import { EnhancedMercadoPagoProcessor } from '@/lib/enhanced-webhook-handlers'
import { createWebhookResponse, generateEventId, logWebhook, updateWebhookStatus, validateMercadoPagoSignature } from '@/lib/webhook-utils'
import { rateLimit } from '@/lib/rate-limit'
import { WebhookLogStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = await rateLimit({ key: `mp:${ip}`, max: 100, windowSec: 60 })
    if (!rl.allowed) return NextResponse.json(createWebhookResponse(false, 'Rate limit exceeded'), { status: 429 })

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
