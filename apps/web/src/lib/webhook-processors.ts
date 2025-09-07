import { prisma } from '@hekate/database';
import { PaymentTransactionStatus, SubscriptionStatus, WebhookLogStatus } from '@prisma/client';
import { logWebhook, updateWebhookStatus } from './webhook-utils';

// Interfaces para os eventos dos webhooks
export interface MercadoPagoWebhookEvent {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export interface AsaasWebhookEvent {
  event: string;
  payment: {
    object: string;
    id: string;
    dateCreated: string;
    customer: string;
    subscription?: string;
    installment?: string;
    paymentLink?: string;
    dueDate: string;
    originalDueDate: string;
    value: number;
    netValue: number;
    billingType: string;
    status: string;
    description: string;
    externalReference?: string;
    confirmedDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl: string;
    invoiceNumber: string;
    deleted: boolean;
    anticipated: boolean;
    anticipable: boolean;
  };
}

// Processador MercadoPago
export class MercadoPagoWebhookProcessor {
  async processPaymentEvent(event: MercadoPagoWebhookEvent, eventId: string): Promise<void> {
    await logWebhook('MERCADOPAGO', event.type, eventId, event);

    try {
      if (event.type === 'payment') {
        await this.handlePaymentUpdate(event.data.id, eventId);
      }

      await updateWebhookStatus('MERCADOPAGO', eventId, WebhookLogStatus.SUCCESS);
    } catch (error) {
      console.error('MercadoPago webhook processing error:', error);
      await updateWebhookStatus('MERCADOPAGO', eventId, WebhookLogStatus.FAILED, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handlePaymentUpdate(paymentId: string, eventId: string): Promise<void> {
    // Buscar detalhes do pagamento na API do MercadoPago
    const paymentDetails = await this.fetchPaymentDetails(paymentId);
    
    if (!paymentDetails) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    // Buscar transação no banco
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { providerPaymentId: paymentId },
      include: { subscription: true }
    });

    if (!transaction) {
      console.warn(`Transaction not found for payment ID: ${paymentId}`);
      return;
    }

    // Mapear status do MercadoPago para nosso enum
    const status = this.mapMercadoPagoStatus(paymentDetails.status);
    
    // Atualizar transação
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        providerStatus: paymentDetails.status,
        paidAt: paymentDetails.status === 'approved' ? new Date() : null,
        failedAt: ['rejected', 'cancelled'].includes(paymentDetails.status) ? new Date() : null,
        refundedAt: paymentDetails.status === 'refunded' ? new Date() : null,
        metadata: {
          ...transaction.metadata as any,
          mercadoPagoDetails: paymentDetails
        }
      }
    });

    // Atualizar status do pedido se houver
    if (transaction.orderId) {
      if (paymentDetails.status === 'approved') {
        await prisma.order.update({ where: { id: transaction.orderId }, data: { status: 'PAID' } })
        // Enviar e-mail de confirmação de pagamento
        try {
          const order = await prisma.order.findUnique({ where: { id: transaction.orderId } })
          if (order?.customerEmail) {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              toEmail: order.customerEmail,
              subject: `Pagamento confirmado • Pedido ${order.orderNumber}`,
              htmlContent: `<h2>Pagamento confirmado</h2><p>Recebemos o pagamento do seu pedido <strong>${order.orderNumber}</strong>.</p>`,
              textContent: `Pagamento confirmado para o pedido ${order.orderNumber}.`,
              priority: 'NORMAL',
            } as any)
          }
        } catch (e) {
          console.error('Erro ao enviar e-mail de pagamento confirmado:', e)
        }
      } else if (['rejected', 'cancelled'].includes(paymentDetails.status)) {
        await prisma.order.update({ where: { id: transaction.orderId }, data: { status: 'CANCELLED' } })
        try {
          const order = await prisma.order.findUnique({ where: { id: transaction.orderId } })
          if (order?.customerEmail) {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              toEmail: order.customerEmail,
              subject: `Falha no pagamento • Pedido ${order.orderNumber}`,
              htmlContent: `<h2>Pagamento não aprovado</h2><p>O pagamento do pedido <strong>${order.orderNumber}</strong> não foi aprovado. Você pode tentar novamente no painel.</p>`,
              textContent: `Pagamento não aprovado para o pedido ${order.orderNumber}.`,
              priority: 'NORMAL',
            } as any)
          }
        } catch (e) {
          console.error('Erro ao enviar e-mail de falha de pagamento:', e)
        }
      }
    }

    // Processar assinatura se existir
    if (transaction.subscription && paymentDetails.status === 'approved') {
      await this.activateSubscription(transaction.subscription.id);
    } else if (transaction.subscription && ['rejected', 'cancelled'].includes(paymentDetails.status)) {
      await this.handleSubscriptionPaymentFailure(transaction.subscription.id);
    }
  }

  private async fetchPaymentDetails(paymentId: string): Promise<any> {
    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('MercadoPago access token not configured');
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching MercadoPago payment details:', error);
      throw error;
    }
  }

  private mapMercadoPagoStatus(status: string): PaymentTransactionStatus {
    const statusMap: Record<string, PaymentTransactionStatus> = {
      'pending': PaymentTransactionStatus.PENDING,
      'approved': PaymentTransactionStatus.COMPLETED,
      'authorized': PaymentTransactionStatus.PROCESSING,
      'in_process': PaymentTransactionStatus.PROCESSING,
      'in_mediation': PaymentTransactionStatus.PROCESSING,
      'rejected': PaymentTransactionStatus.FAILED,
      'cancelled': PaymentTransactionStatus.CANCELED,
      'refunded': PaymentTransactionStatus.REFUNDED,
      'charged_back': PaymentTransactionStatus.REFUNDED
    };

    return statusMap[status] || PaymentTransactionStatus.PENDING;
  }

  private async activateSubscription(subscriptionId: string): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth
      }
    });
  }

  private async handleSubscriptionPaymentFailure(subscriptionId: string): Promise<void> {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE
      }
    });
  }
}

// Processador Asaas
export class AsaasWebhookProcessor {
  async processPaymentEvent(event: AsaasWebhookEvent, eventId: string): Promise<void> {
    await logWebhook('ASAAS', event.event, eventId, event);

    try {
      switch (event.event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentSuccess(event.payment, eventId);
          break;
        case 'PAYMENT_OVERDUE':
        case 'PAYMENT_DELETED':
          await this.handlePaymentFailure(event.payment, eventId);
          break;
        case 'PAYMENT_REFUNDED':
          await this.handlePaymentRefund(event.payment, eventId);
          break;
        default:
          console.warn(`Unhandled Asaas event type: ${event.event}`);
      }

      await updateWebhookStatus('ASAAS', eventId, WebhookLogStatus.SUCCESS);
    } catch (error) {
      console.error('Asaas webhook processing error:', error);
      await updateWebhookStatus('ASAAS', eventId, WebhookLogStatus.FAILED, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handlePaymentSuccess(payment: AsaasWebhookEvent['payment'], eventId: string): Promise<void> {
    // Buscar transação no banco
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { providerPaymentId: payment.id },
      include: { subscription: true }
    });

    if (!transaction) {
      console.warn(`Transaction not found for Asaas payment ID: ${payment.id}`);
      return;
    }

    // Atualizar transação
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentTransactionStatus.COMPLETED,
        providerStatus: payment.status,
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        metadata: {
          ...transaction.metadata as any,
          asaasDetails: payment
        }
      }
    });

    // Ativar assinatura se existir
    if (transaction.subscription) {
      await this.activateSubscription(transaction.subscription.id);
    }
  }

  private async handlePaymentFailure(payment: AsaasWebhookEvent['payment'], eventId: string): Promise<void> {
    // Buscar transação no banco
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { providerPaymentId: payment.id },
      include: { subscription: true }
    });

    if (!transaction) {
      console.warn(`Transaction not found for Asaas payment ID: ${payment.id}`);
      return;
    }

    // Determinar status baseado no evento
    const status = payment.deleted ? PaymentTransactionStatus.CANCELED : PaymentTransactionStatus.FAILED;

    // Atualizar transação
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        providerStatus: payment.status,
        failedAt: new Date(),
        metadata: {
          ...transaction.metadata as any,
          asaasDetails: payment
        }
      }
    });

    // Atualizar status da assinatura se existir
    if (transaction.subscription) {
      await this.handleSubscriptionPaymentFailure(transaction.subscription.id);
    }
  }

  private async handlePaymentRefund(payment: AsaasWebhookEvent['payment'], eventId: string): Promise<void> {
    // Buscar transação no banco
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { providerPaymentId: payment.id },
      include: { subscription: true }
    });

    if (!transaction) {
      console.warn(`Transaction not found for Asaas payment ID: ${payment.id}`);
      return;
    }

    // Atualizar transação
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentTransactionStatus.REFUNDED,
        providerStatus: payment.status,
        refundedAt: new Date(),
        metadata: {
          ...transaction.metadata as any,
          asaasDetails: payment
        }
      }
    });

    // Cancelar assinatura se existir
    if (transaction.subscription) {
      await this.cancelSubscription(transaction.subscription.id);
    }
  }

  private async activateSubscription(subscriptionId: string): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth
      }
    });
  }

  private async handleSubscriptionPaymentFailure(subscriptionId: string): Promise<void> {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE
      }
    });
  }

  private async cancelSubscription(subscriptionId: string): Promise<void> {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        canceledAt: new Date()
      }
    });
  }
}

// Monitor de webhooks
export class WebhookMonitor {
  async getStatistics(provider?: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const where = {
      createdAt: { gte: since },
      ...(provider && { provider })
    };

    const [total, successful, failed, retried] = await Promise.all([
      prisma.webhookLog.count({ where }),
      prisma.webhookLog.count({ where: { ...where, status: WebhookLogStatus.SUCCESS } }),
      prisma.webhookLog.count({ where: { ...where, status: WebhookLogStatus.FAILED } }),
      prisma.webhookLog.count({ where: { ...where, status: WebhookLogStatus.RETRY } })
    ]);

    return {
      total,
      successful,
      failed,
      retried,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  }

  async getFailedWebhooks(provider?: string, limit: number = 50) {
    return prisma.webhookLog.findMany({
      where: {
        status: WebhookLogStatus.FAILED,
        ...(provider && { provider })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
