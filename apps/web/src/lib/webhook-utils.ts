import crypto from 'crypto';
import { prisma } from '@hekate/database';
import { WebhookLogStatus } from '@prisma/client';

// Tipos para os webhooks
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  provider: 'MERCADOPAGO' | 'ASAAS';
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

// Função para gerar ID único do evento
export function generateEventId(provider: string, data: any): string {
  const timestamp = Date.now();
  const dataString = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(`${provider}-${timestamp}-${dataString}`).digest('hex');
  return `${provider.toLowerCase()}_${timestamp}_${hash.substring(0, 8)}`;
}

// Validação de assinatura MercadoPago
export function validateMercadoPagoSignature(
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    if (!signature || !secret) {
      return { isValid: false, error: 'Missing signature or secret' };
    }

    // MercadoPago usa HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return { isValid };
  } catch (error) {
    return { isValid: false, error: `Signature validation failed: ${error}` };
  }
}

// Validação de token Asaas
export function validateAsaasToken(
  token: string,
  expectedToken: string
): WebhookValidationResult {
  try {
    if (!token || !expectedToken) {
      return { isValid: false, error: 'Missing token' };
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );

    return { isValid };
  } catch (error) {
    return { isValid: false, error: `Token validation failed: ${error}` };
  }
}

// Verificação de webhook duplicado
export async function checkDuplicateWebhook(
  provider: string,
  eventId: string
): Promise<boolean> {
  try {
    const existing = await prisma.webhookLog.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId
        }
      }
    });

    return !!existing;
  } catch (error) {
    console.error('Error checking duplicate webhook:', error);
    return false;
  }
}

// Log do webhook
export async function logWebhook(
  provider: string,
  eventType: string,
  eventId: string,
  payload: any,
  status: WebhookLogStatus = WebhookLogStatus.PENDING,
  error?: string
) {
  try {
    await prisma.webhookLog.create({
      data: {
        provider,
        eventType,
        eventId,
        payload,
        status,
        error
      }
    });
  } catch (err) {
    console.error('Error logging webhook:', err);
  }
}

// Atualizar status do webhook
export async function updateWebhookStatus(
  provider: string,
  eventId: string,
  status: WebhookLogStatus,
  error?: string
) {
  try {
    await prisma.webhookLog.update({
      where: {
        provider_eventId: {
          provider,
          eventId
        }
      },
      data: {
        status,
        error,
        processedAt: new Date()
      }
    });
  } catch (err) {
    console.error('Error updating webhook status:', err);
  }
}

// Processamento com retry
export async function processWebhookWithRetry<T>(
  processor: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processor();
    } catch (error) {
      lastError = error as Error;
      console.error(`Webhook processing attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError!;
}

// Estrutura de resposta padronizada
export function createWebhookResponse(
  success: boolean,
  message: string,
  data?: any
) {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// Validação de estrutura do payload
export function validatePayloadStructure(
  payload: any,
  requiredFields: string[]
): WebhookValidationResult {
  try {
    for (const field of requiredFields) {
      if (!(field in payload)) {
        return {
          isValid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Payload validation failed: ${error}`
    };
  }
}

// Rate limiting simples
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}