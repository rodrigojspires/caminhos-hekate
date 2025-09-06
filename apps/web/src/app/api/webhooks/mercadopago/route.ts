import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoWebhookProcessor, type MercadoPagoWebhookEvent } from '@/lib/webhook-processors';
import {
  generateEventId,
  validateMercadoPagoSignature,
  checkDuplicateWebhook,
  processWebhookWithRetry,
  createWebhookResponse,
  validatePayloadStructure,
  checkRateLimit
} from '@/lib/webhook-utils';

const processor = new MercadoPagoWebhookProcessor();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventId: string | null = null;

  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`mercadopago_${clientIp}`, 100, 60000)) {
      return NextResponse.json(
        createWebhookResponse(false, 'Rate limit exceeded'),
        { status: 429 }
      );
    }

    // Obter body como texto para validação de assinatura
    const bodyText = await request.text();
    let body: MercadoPagoWebhookEvent;

    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      return NextResponse.json(
        createWebhookResponse(false, 'Invalid JSON payload'),
        { status: 400 }
      );
    }

    // Gerar ID único do evento
    eventId = generateEventId('MERCADOPAGO', body);

    // Validar estrutura do payload
    const structureValidation = validatePayloadStructure(body, ['type', 'data']);
    if (!structureValidation.isValid) {
      return NextResponse.json(
        createWebhookResponse(false, structureValidation.error || 'Invalid payload structure'),
        { status: 400 }
      );
    }

    // Validar assinatura (se configurada)
    const signature = request.headers.get('x-signature');
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const signatureValidation = validateMercadoPagoSignature(bodyText, signature, webhookSecret);
      if (!signatureValidation.isValid) {
        return NextResponse.json(
          createWebhookResponse(false, 'Invalid signature'),
          { status: 401 }
        );
      }
    }

    // Verificar webhook duplicado
    const isDuplicate = await checkDuplicateWebhook('MERCADOPAGO', eventId);
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
    console.log(`MercadoPago webhook processed successfully in ${processingTime}ms`);

    return NextResponse.json(
      createWebhookResponse(true, 'Webhook processed successfully', {
        eventId,
        processingTime
      }),
      { status: 200 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('MercadoPago webhook processing error:', {
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

// Método GET para verificação de saúde do webhook
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook MercadoPago está funcionando',
    timestamp: new Date().toISOString(),
  });
}