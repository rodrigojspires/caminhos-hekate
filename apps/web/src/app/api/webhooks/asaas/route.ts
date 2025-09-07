import { NextRequest, NextResponse } from 'next/server';
import { AsaasWebhookProcessor, type AsaasWebhookEvent } from '@/lib/webhook-processors';
import {
  generateEventId,
  validateAsaasToken,
  checkDuplicateWebhook,
  processWebhookWithRetry,
  createWebhookResponse,
  validatePayloadStructure,
  checkRateLimit
} from '@/lib/webhook-utils';
import { rateLimit } from '@/lib/rate-limit'

const processor = new AsaasWebhookProcessor();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventId: string | null = null;

  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = await rateLimit({ key: `asaas:${clientIp}`, max: 100, windowSec: 60 })
    if (!rl.allowed) {
      return NextResponse.json(
        createWebhookResponse(false, 'Rate limit exceeded'),
        { status: 429 }
      );
    }

    // Parse do body
    let body: AsaasWebhookEvent;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        createWebhookResponse(false, 'Invalid JSON payload'),
        { status: 400 }
      );
    }

    // Gerar ID único do evento
    eventId = generateEventId('ASAAS', body);

    // Log estruturado do webhook
    console.log('Asaas webhook received:', {
      event: body.event,
      paymentId: body.payment?.id,
      eventId,
      timestamp: new Date().toISOString(),
    });

    // Validar estrutura do payload
    const structureValidation = validatePayloadStructure(body, ['event', 'payment']);
    if (!structureValidation.isValid) {
      return NextResponse.json(
        createWebhookResponse(false, structureValidation.error || 'Invalid payload structure'),
        { status: 400 }
      );
    }

    // Validação do token (se configurado)
    const token = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    
    if (expectedToken && token) {
      const tokenValidation = validateAsaasToken(token, expectedToken);
      if (!tokenValidation.isValid) {
        return NextResponse.json(
          createWebhookResponse(false, 'Invalid token'),
          { status: 401 }
        );
      }
    }

    // Verificar webhook duplicado
    const isDuplicate = await checkDuplicateWebhook('ASAAS', eventId);
    if (isDuplicate) {
      return NextResponse.json(
        createWebhookResponse(true, 'Webhook already processed'),
        { status: 200 }
      );
    }

    // Processar webhook com retry
    await processWebhookWithRetry(
      () => processor.processPaymentEvent(body, eventId!),
      3,
      1000
    );

    const processingTime = Date.now() - startTime;
    console.log(`Asaas webhook processed successfully in ${processingTime}ms`);

    return NextResponse.json(
      createWebhookResponse(true, 'Webhook processed successfully', {
        eventId,
        processingTime
      }),
      { status: 200 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Asaas webhook processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventId,
      processingTime
    });

    return NextResponse.json(
      createWebhookResponse(false, 'Internal server error', {
        eventId,
        processingTime
      }),
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'Asaas',
    timestamp: new Date().toISOString(),
  });
}
