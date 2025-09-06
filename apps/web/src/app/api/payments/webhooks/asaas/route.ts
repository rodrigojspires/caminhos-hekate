import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAsaasProcessor } from '@/lib/enhanced-webhook-handlers'
import { createWebhookResponse, generateEventId, logWebhook, updateWebhookStatus, validateAsaasToken } from '@/lib/webhook-utils'
import { WebhookLogStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-asaas-access-token') || ''
    const expected = process.env.ASAAS_WEBHOOK_TOKEN || ''
    const payload = await request.json().catch(() => null)
    if (!payload) return NextResponse.json(createWebhookResponse(false, 'Invalid JSON payload'), { status: 400 })

    const validation = validateAsaasToken(token, expected)
    if (!validation.isValid) {
      console.warn('Asaas token invalid:', validation.error)
      // continue but mark as failed in log later if needed
    }

    const event: string = payload?.event || 'payment.updated'
    const payment = payload?.payment || payload

    const eventId = generateEventId('ASAAS', payload)
    await logWebhook('ASAAS', event, eventId, payload, WebhookLogStatus.PENDING)

    const processor = new EnhancedAsaasProcessor()
    const result = await processor.processPaymentWebhook(event, payment)

    await updateWebhookStatus('ASAAS', eventId, WebhookLogStatus.SUCCESS)
    return NextResponse.json(createWebhookResponse(true, 'Processed', result))
  } catch (error) {
    console.error('Asaas webhook error:', error)
    const eventId = generateEventId('ASAAS', { error: true })
    await logWebhook('ASAAS', 'error', eventId, { error: String(error) }, WebhookLogStatus.FAILED, (error as Error)?.message)
    return NextResponse.json(createWebhookResponse(false, 'Internal error'), { status: 500 })
  }
}

