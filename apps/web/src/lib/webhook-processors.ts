import { prisma } from '@hekate/database';
import { PaymentTransactionStatus, SubscriptionStatus, WebhookLogStatus } from '@prisma/client';
import { logWebhook, updateWebhookStatus } from './webhook-utils';
import { GamificationEngine } from '@/lib/gamification-engine';
import notificationService from '@/lib/notifications/notification-service';

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

const COURSE_PURCHASE_POINTS = 120;
const PAID_EVENT_ENROLL_POINTS = 40;
const FREE_EVENT_ENROLL_POINTS = 10;
const COMMUNITY_PURCHASE_POINTS = 40;

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

    const txMetadata: any = paymentDetails.metadata || {}
    const externalReference = paymentDetails.external_reference || null
    const metaTransactionId = txMetadata.transaction_id || txMetadata.transactionId || null

    // Buscar transação no banco com fallbacks (paymentId, metadata.transaction_id, preference id)
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { providerPaymentId: paymentId },
          metaTransactionId ? { id: metaTransactionId } : undefined,
          metaTransactionId ? { providerPaymentId: metaTransactionId } : undefined,
          externalReference ? { providerPaymentId: externalReference } : undefined,
          paymentDetails.order?.id ? { providerPaymentId: paymentDetails.order.id } : undefined,
        ].filter(Boolean) as any
      },
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
        providerPaymentId: paymentId,
        paidAt: paymentDetails.status === 'approved' ? new Date() : null,
        failedAt: ['rejected', 'cancelled'].includes(paymentDetails.status) ? new Date() : null,
        refundedAt: paymentDetails.status === 'refunded' ? new Date() : null,
        metadata: {
          ...transaction.metadata as any,
          mercadoPagoDetails: paymentDetails,
          external_reference: externalReference ?? (transaction.metadata as any)?.external_reference ?? null
        }
      }
    });

    // Atualizar status do pedido se houver
    if (transaction.orderId) {
      if (paymentDetails.status === 'approved') {
        const updatedOrder = await prisma.order.update({ where: { id: transaction.orderId }, data: { status: 'PAID' } })

        // Gerar registros de download para itens digitais
        try {
          const { createDownloadsForOrder } = await import('@/lib/downloads')
          const created = await createDownloadsForOrder(updatedOrder.id)
          if (created > 0) {
            // Notificar por e-mail que downloads estão disponíveis
            const order = await prisma.order.findUnique({ where: { id: updatedOrder.id } })
            if (order?.customerEmail) {
              const { sendEmail } = await import('@/lib/email')
              await sendEmail({
                toEmail: order.customerEmail,
                subject: `Downloads disponíveis • Pedido ${order.orderNumber}`,
                htmlContent: `<h2>Seus downloads estão prontos</h2><p>Os arquivos digitais do pedido <strong>${order.orderNumber}</strong> já estão disponíveis em seu painel: <a href="${process.env.NEXTAUTH_URL || ''}/dashboard/downloads">Meus Downloads</a>.</p>`,
                textContent: `Seus downloads do pedido ${order.orderNumber} estão disponíveis em ${(process.env.NEXTAUTH_URL || '') + '/dashboard/downloads'}`,
                priority: 'NORMAL',
              } as any)
            }
          }
        } catch (e) {
          console.error('Erro ao gerar downloads após pagamento:', e)
        }

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

        // Inscrever usuário em cursos vinculados ao pedido (se fornecido em metadata)
        try {
          const order = await prisma.order.findUnique({ where: { id: transaction.orderId }, include: { items: true } })
          if (order?.userId) {
            const fromOrderMeta: any = order.metadata || {}
            const fromTxMeta: any = transaction.metadata || {}
            const metaCourseIds: any[] = []
            if (Array.isArray(fromOrderMeta.enrollCourseIds)) metaCourseIds.push(...fromOrderMeta.enrollCourseIds)
            if (Array.isArray(fromTxMeta.enrollCourseIds)) metaCourseIds.push(...fromTxMeta.enrollCourseIds)

            // Normaliza e evita duplicados
            const courseIds = Array.from(
              new Set(
                metaCourseIds
                  .map((id) => (id != null ? String(id) : null))
                  .filter((id): id is string => !!id && id.trim().length > 0)
              )
            )

            for (const courseId of courseIds) {
              await prisma.enrollment.upsert({
                where: { userId_courseId: { userId: order.userId, courseId } },
                create: { userId: order.userId, courseId, status: 'active' },
                update: { status: 'active' }
              })

              const uniqueKey = `course_purchase_${order.id}_${courseId}`
              const alreadyAwarded = await prisma.pointTransaction.findFirst({
                where: {
                  userId: order.userId,
                  metadata: {
                    path: ['uniqueKey'],
                    equals: uniqueKey
                  }
                }
              })

              if (!alreadyAwarded) {
                await GamificationEngine.processEvent({
                  userId: order.userId,
                  type: 'COURSE_PURCHASED',
                  points: COURSE_PURCHASE_POINTS,
                  metadata: {
                    eventType: 'COURSE_PURCHASED',
                    reasonLabel: 'Compra de curso',
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    courseId,
                    uniqueKey
                  }
                })
              }
            }

            // Registrar usuário em eventos pagos
            const metaEventIds: any[] = []
            if (Array.isArray(fromOrderMeta.eventIds)) metaEventIds.push(...fromOrderMeta.eventIds)
            if (Array.isArray(fromTxMeta.eventIds)) metaEventIds.push(...fromTxMeta.eventIds)

            // Buscar eventIds de itens (metadata.eventId)
            order.items.forEach((item) => {
              const evId = (item.metadata as any)?.eventId
              if (evId) metaEventIds.push(evId)
            })

            const eventIds = Array.from(
              new Set(
                metaEventIds
                  .map((id) => (id != null ? String(id) : null))
                  .filter((id): id is string => !!id && id.trim().length > 0)
              )
            )

            for (const eventId of eventIds) {
              const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: { id: true, title: true, status: true, accessType: true }
              })
              if (!event || event.status !== 'PUBLISHED') continue

              await prisma.eventRegistration.upsert({
                where: {
                  eventId_userId_recurrenceInstanceId: {
                    eventId,
                    userId: order.userId,
                    recurrenceInstanceId: eventId
                  }
                },
                create: {
                  eventId,
                  recurrenceInstanceId: eventId,
                  userId: order.userId,
                  status: 'CONFIRMED',
                  registeredAt: new Date(),
                  metadata: { orderId: order.id, orderNumber: order.orderNumber }
                },
                update: {
                  status: 'CONFIRMED',
                  metadata: { orderId: order.id, orderNumber: order.orderNumber }
                }
              })

              const uniqueKey = `event_purchase_${order.id}_${eventId}`
              const existingTx = await prisma.pointTransaction.findFirst({
                where: {
                  userId: order.userId,
                  metadata: {
                    path: ['uniqueKey'],
                    equals: uniqueKey
                  }
                }
              })

              const isPaidEvent = event.accessType === 'PAID'
              const pointsToAward = isPaidEvent ? PAID_EVENT_ENROLL_POINTS : FREE_EVENT_ENROLL_POINTS

              if (!existingTx && pointsToAward > 0) {
                await GamificationEngine.awardPoints(order.userId, pointsToAward, 'EVENT_ENROLLED', {
                  eventId,
                  eventTitle: event.title,
                  paid: isPaidEvent,
                  reasonLabel: isPaidEvent ? 'Inscrição em evento pago' : 'Inscrição em evento gratuito',
                  uniqueKey
                })

                const userPoints = await prisma.userPoints.findUnique({
                  where: { userId: order.userId },
                  select: { totalPoints: true }
                })

                await notificationService.createNotification({
                  userId: order.userId,
                  type: 'SPECIAL_EVENT' as any,
                  title: 'Pontos ganhos no evento',
                  message: `Você ganhou ${pointsToAward} pontos ao confirmar ${event.title}.`,
                  data: {
                    points: pointsToAward,
                    eventId,
                    eventTitle: event.title,
                    paid: isPaidEvent,
                    totalPoints: userPoints?.totalPoints ?? undefined
                  },
                  priority: isPaidEvent ? 'MEDIUM' : 'LOW'
                })
              }
            }

            const metaCommunityIds: any[] = []
            if (Array.isArray(fromOrderMeta.communityIds)) metaCommunityIds.push(...fromOrderMeta.communityIds)
            if (Array.isArray(fromTxMeta.communityIds)) metaCommunityIds.push(...fromTxMeta.communityIds)
            order.items.forEach((item) => {
              const communityId = (item.metadata as any)?.communityId
              if (communityId) metaCommunityIds.push(communityId)
            })

            const communityIds = Array.from(
              new Set(
                metaCommunityIds
                  .map((id) => (id != null ? String(id) : null))
                  .filter((id): id is string => !!id && id.trim().length > 0)
              )
            )

            for (const communityId of communityIds) {
              const community = await prisma.community.findUnique({
                where: { id: communityId },
                select: { accessModels: true }
              })
              const accessModels = (community?.accessModels || []) as string[]
              const isPaidCommunity = accessModels.includes('ONE_TIME')
              const now = new Date()

              const existing = await prisma.communityMembership.findUnique({
                where: { communityId_userId: { communityId, userId: order.userId } },
                select: { paidUntil: true }
              })

              let paidUntil = existing?.paidUntil || null
              if (isPaidCommunity) {
                const baseDate = paidUntil && paidUntil > now ? paidUntil : now
                const next = new Date(baseDate)
                next.setMonth(next.getMonth() + 1)
                paidUntil = next
              }

              await prisma.communityMembership.upsert({
                where: { communityId_userId: { communityId, userId: order.userId } },
                create: { communityId, userId: order.userId, status: 'active', paidUntil },
                update: { status: 'active', paidUntil, cancelledAt: null }
              })

              if (isPaidCommunity) {
                const uniqueKey = `community_purchase_${order.id}_${communityId}`
                const alreadyAwarded = await prisma.pointTransaction.findFirst({
                  where: {
                    userId: order.userId,
                    metadata: {
                      path: ['uniqueKey'],
                      equals: uniqueKey
                    }
                  }
                })

                if (!alreadyAwarded) {
                  await GamificationEngine.awardPoints(order.userId, COMMUNITY_PURCHASE_POINTS, 'COMMUNITY_ENROLLED_PAID', {
                    communityId,
                    reasonLabel: 'Inscrição em comunidade paga',
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    uniqueKey
                  })
                }
              }
            }
          }
        } catch (e) {
          console.error('Erro ao inscrever usuário após pagamento:', e)
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

    try {
      const sub = await prisma.userSubscription.findUnique({ where: { id: subscriptionId } })
      if (sub) {
        const { createDownloadsForSubscription } = await import('@/lib/downloads')
        await createDownloadsForSubscription(sub.userId, sub.planId)
      }
    } catch (e) {
      console.error('Erro ao criar downloads incluídos no plano (MercadoPago):', e)
    }
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

    try {
      const sub = await prisma.userSubscription.findUnique({ where: { id: subscriptionId } })
      if (sub) {
        const { createDownloadsForSubscription } = await import('@/lib/downloads')
        await createDownloadsForSubscription(sub.userId, sub.planId)
      }
    } catch (e) {
      console.error('Erro ao criar downloads incluídos no plano (Asaas):', e)
    }
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
