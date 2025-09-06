import { prisma } from '@hekate/database';
import { logWebhook } from './webhook-utils';

// Enhanced MercadoPago webhook processor
export class EnhancedMercadoPagoProcessor {
  async processPaymentWebhook(data: any) {
    const { id, status, transaction_amount, payer, external_reference } = data;
    
    try {
      // Busca a transação existente
      const transaction = await prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            { providerPaymentId: id.toString() },
            { providerPaymentId: external_reference },
          ],
        },
        include: { subscription: { include: { user: true } } },
      });

      if (!transaction) {
        console.warn(`Transação não encontrada para pagamento ${id}`);
        return { processed: false, reason: 'Transaction not found' };
      }

      // Mapeia status do MercadoPago para status interno
      const statusMap: Record<string, string> = {
        approved: 'COMPLETED',
        pending: 'PENDING',
        in_process: 'PROCESSING',
        rejected: 'FAILED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };

      const newStatus = statusMap[status] || 'PENDING';
      
      // Atualiza a transação
      await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus as any,
            metadata: data,
            updatedAt: new Date(),
          },
        });

      // Se aprovado, ativa a assinatura
        if (status === 'approved' && transaction.subscriptionId && transaction.subscription?.user) {
          await this.activateSubscription(transaction.subscriptionId, transaction.subscription.user.id);
        }

        // Se rejeitado ou cancelado, marca como falha
        if (['rejected', 'cancelled'].includes(status) && transaction.subscriptionId && transaction.subscription?.user) {
          await this.handlePaymentFailure(transaction.subscriptionId, transaction.subscription.user.id);
        }

      return { processed: true, transactionId: transaction.id, newStatus };
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento MercadoPago:', error);
      throw error;
    }
  }

  private async activateSubscription(subscriptionId: string, userId: string) {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
      },
    });

    // Atualiza o plano do usuário
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (subscription) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          // planId: subscription.planId,
          // planExpiresAt: subscription.endsAt,
        },
      });
    }
  }

  private async handlePaymentFailure(subscriptionId: string, userId: string) {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAST_DUE',
      },
    });

    // Criar notificação de falha de pagamento
      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Falha no Pagamento',
            content: 'Houve um problema com seu pagamento. Tente novamente.',
            channel: 'EMAIL',
            metadata: { subscriptionId },
          },
        });
      }
  }
}

// Enhanced Asaas webhook processor
export class EnhancedAsaasProcessor {
  async processPaymentWebhook(event: string, payment: any) {
    try {
      const transaction = await prisma.paymentTransaction.findFirst({
          where: {
            providerPaymentId: payment.id,
          },
          include: { subscription: { include: { user: true } } },
       });

      if (!transaction) {
        console.warn(`Transação não encontrada para pagamento Asaas ${payment.id}`);
        return { processed: false, reason: 'Transaction not found' };
      }

      switch (event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentSuccess(transaction, payment);
          break;
        case 'PAYMENT_OVERDUE':
        case 'PAYMENT_DELETED':
          await this.handlePaymentFailure(transaction, payment);
          break;
        case 'PAYMENT_REFUNDED':
          await this.handlePaymentRefund(transaction, payment);
          break;
        default:
          console.log(`Evento Asaas não tratado: ${event}`);
          return { processed: false, reason: 'Event not handled' };
      }

      return { processed: true, transactionId: transaction.id, event };
    } catch (error) {
      console.error('Erro ao processar webhook Asaas:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(transaction: any, payment: any) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        metadata: payment,
        updatedAt: new Date(),
      },
    });

    if (transaction.subscriptionId) {
      await this.activateSubscription(transaction.subscriptionId, transaction.userId);
    }
  }

  private async handlePaymentFailure(transaction: any, payment: any) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        metadata: payment,
        updatedAt: new Date(),
      },
    });

    if (transaction.subscriptionId) {
      await prisma.subscription.update({
        where: { id: transaction.subscriptionId },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  private async handlePaymentRefund(transaction: any, payment: any) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'REFUNDED',
        metadata: payment,
        updatedAt: new Date(),
      },
    });
  }

  private async activateSubscription(subscriptionId: string, userId: string) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
      },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (subscription) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          // planId: subscription.planId,
          // planExpiresAt: subscription.endsAt,
        },
      });
    }
  }
}

// Webhook monitoring and analytics
export class WebhookMonitor {
  async getWebhookStats(provider?: string, timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const whereClause = {
      processedAt: {
        gte: startDate,
        lte: now,
      },
      ...(provider && { provider }),
    };

    const [total, successful, failed, retries] = await Promise.all([
      prisma.webhookLog.count({ where: whereClause }),
      prisma.webhookLog.count({ where: { ...whereClause, status: 'SUCCESS' } }),
      prisma.webhookLog.count({ where: { ...whereClause, status: 'FAILED' } }),
      prisma.webhookLog.count({ where: { ...whereClause, status: 'RETRY' } }),
    ]);

    return {
      total,
      successful,
      failed,
      retries,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      timeframe,
      provider: provider || 'all',
    };
  }

  async getFailedWebhooks(limit: number = 50) {
    return prisma.webhookLog.findMany({
      where: { status: 'FAILED' },
      orderBy: { processedAt: 'desc' },
      take: limit,
    });
  }
}
