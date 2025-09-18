import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { prisma } from '@hekate/database';

export interface MercadoPagoPaymentData {
  amount: number;
  description: string;
  userId: string;
  subscriptionPlanId: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoPreferenceData {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
  description?: string;
  external_reference?: string;
  notification_url?: string;
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  metadata?: Record<string, any>;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private payment: Payment;
  private preference: Preference;

  constructor() {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required');
    }

    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: 'abc',
      },
    });

    this.payment = new Payment(this.client);
    this.preference = new Preference(this.client);
  }

  /**
   * Cria uma preferência de pagamento no MercadoPago
   */
  async createPreference(data: MercadoPagoPreferenceData) {
    try {
      const preferenceData = {
        items: [
          {
            id: data.external_reference || data.title,
            title: data.title,
            quantity: data.quantity,
            unit_price: data.unit_price,
            currency_id: data.currency_id,
            description: data.description,
          },
        ],
        external_reference: data.external_reference,
        notification_url: data.notification_url,
        back_urls: data.back_urls,
        metadata: data.metadata,
        auto_return: 'approved' as const,
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
      };

      const preference = await this.preference.create({ body: preferenceData });
      return preference;
    } catch (error) {
      console.error('Erro ao criar preferência MercadoPago:', error);
      throw new Error('Falha ao criar preferência de pagamento');
    }
  }

  /**
   * Busca informações de um pagamento
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await this.payment.get({ id: paymentId });
      return payment;
    } catch (error) {
      console.error('Erro ao buscar pagamento MercadoPago:', error);
      throw new Error('Falha ao buscar informações do pagamento');
    }
  }

  /**
   * Processa webhook do MercadoPago
   */
  async processWebhook(data: any) {
    try {
      const { type, data: webhookData } = data;

      if (type === 'payment') {
        const paymentId = webhookData.id;
        const payment = await this.getPayment(paymentId);

        // Atualiza o status da transação no banco de dados
        await this.updatePaymentTransaction(payment);

        return { success: true, payment };
      }

      return { success: true, message: 'Webhook processado' };
    } catch (error) {
      console.error('Erro ao processar webhook MercadoPago:', error);
      throw new Error('Falha ao processar webhook');
    }
  }

  /**
   * Atualiza transação de pagamento no banco de dados
   */
  private async updatePaymentTransaction(payment: any) {
    try {
      const externalReference = payment.external_reference;
      
      if (!externalReference) {
        console.warn('Pagamento sem referência externa:', payment.id);
        return;
      }

      let status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED' = 'PENDING';
      
      switch (payment.status) {
        case 'approved':
          status = 'COMPLETED';
          break;
        case 'rejected':
        case 'cancelled':
          status = 'FAILED';
          break;
        case 'refunded':
          status = 'CANCELED';
          break;
        default:
          status = 'PENDING';
      }

      // Atualiza a transação no banco
      const transaction = await prisma.paymentTransaction.update({
        where: {
          providerPaymentId: payment.id.toString(),
        },
        data: {
          status,
          metadata: {
            mercadopago_status: payment.status,
            mercadopago_status_detail: payment.status_detail,
            mercadopago_payment_method: payment.payment_method_id,
          },
        },
      });

      // Se o pagamento foi aprovado, ativa a assinatura
      if (status === 'COMPLETED' && transaction.subscriptionId) {
        await this.activateSubscription(transaction.subscriptionId);
      }

      return transaction;
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  }

  /**
   * Ativa uma assinatura após pagamento aprovado
   */
  private async activateSubscription(subscriptionId: string) {
    try {
      const updated = await prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
        },
        include: { plan: true },
      });

      // Atualiza tier do usuário conforme o plano
      try {
        if (updated.plan?.tier) {
          await prisma.user.update({ where: { id: updated.userId }, data: { subscriptionTier: updated.plan.tier as any } })
        }
      } catch (e) {
        console.error('Erro ao atualizar subscriptionTier do usuário (MP):', e)
      }

      try {
        const { createDownloadsForSubscription } = await import('@/lib/downloads')
        await createDownloadsForSubscription(updated.userId, updated.planId)
      } catch (e) {
        console.error('Erro ao criar downloads do plano (MP service):', e)
      }
    } catch (error) {
      console.error('Erro ao ativar assinatura:', error);
      throw error;
    }
  }

  /**
   * Cria uma transação de pagamento para assinatura
   */
  async createSubscriptionPayment(data: MercadoPagoPaymentData) {
    try {
      // Busca o plano de assinatura
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.subscriptionPlanId },
      });

      if (!plan) {
        throw new Error('Plano de assinatura não encontrado');
      }

      // Cria a transação no banco
      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          currency: 'BRL',
          provider: 'MERCADOPAGO',
          status: 'PENDING',
          metadata: {
            ...data.metadata,
            description: data.description,
          },
        },
      });

      // Cria a preferência no MercadoPago
      const preference = await this.createPreference({
        title: plan.name,
        quantity: 1,
        unit_price: data.amount,
        currency_id: 'BRL',
        description: data.description,
        external_reference: transaction.id,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/dashboard/subscription?status=success`,
          failure: `${process.env.NEXTAUTH_URL}/dashboard/subscription?status=failure`,
          pending: `${process.env.NEXTAUTH_URL}/dashboard/subscription?status=pending`,
        },
        metadata: {
          transaction_id: transaction.id,
          user_id: data.userId,
          plan_id: data.subscriptionPlanId,
        },
      });

      // Atualiza a transação com o ID da preferência
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          providerPaymentId: preference.id,
        },
      });

      return {
        transaction,
        preference,
        paymentUrl: preference.init_point,
      };
    } catch (error) {
      console.error('Erro ao criar pagamento de assinatura:', error);
      throw new Error('Falha ao criar pagamento');
    }
  }

  /**
   * Cria preferência e transação para um pedido (ordem única)
   */
  async createOrderPayment(order: {
    orderId: string
    userId?: string | null
    items: Array<{ id: string; title: string; quantity: number; unit_price: number }>
    totalAmount: number
    description?: string
    shippingAmount?: number
    discountAmount?: number
    couponCode?: string | null
  }) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) || 'https://caminhosdehekate.com.br'
      // Cria a transação vinculada ao pedido
      const tx = await prisma.paymentTransaction.create({
        data: {
          userId: order.userId || undefined,
          orderId: order.orderId,
          amount: order.totalAmount,
          currency: 'BRL',
          provider: 'MERCADOPAGO',
          status: 'PENDING',
          metadata: {
            description: order.description || `Pedido ${order.orderId}`,
          },
        },
      })

      const roundCurrency = (value: number) => Math.round(value * 100) / 100

      const preferenceBody: Record<string, any> = {
        items: order.items.map((i) => ({
          id: i.id,
          title: i.title,
          quantity: i.quantity,
          unit_price: roundCurrency(i.unit_price),
          currency_id: 'BRL',
        })),
        external_reference: tx.id,
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${baseUrl}/checkout?status=success&order=${encodeURIComponent(order.orderId)}`,
          failure: `${baseUrl}/checkout?status=failure&order=${encodeURIComponent(order.orderId)}`,
          pending: `${baseUrl}/checkout?status=pending&order=${encodeURIComponent(order.orderId)}`,
        },
        metadata: { transaction_id: tx.id, order_id: order.orderId },
        auto_return: 'approved' as const,
      }

      const shippingAmount = typeof order.shippingAmount === 'number' ? roundCurrency(order.shippingAmount) : 0
      if (shippingAmount > 0) {
        preferenceBody.shipments = {
          cost: shippingAmount,
          mode: 'custom',
        }
      }

      const discountAmount = typeof order.discountAmount === 'number' ? roundCurrency(order.discountAmount) : 0
      if (discountAmount > 0) {
        preferenceBody.coupon_amount = discountAmount
        if (order.couponCode) {
          preferenceBody.coupon_code = order.couponCode
        }
      }

      const preference = await this.preference.create({
        body: preferenceBody,
      })

      await prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: { providerPaymentId: preference.id },
      })

      // Alguns ambientes retornam sandbox_init_point; preferir init_point e fallback para sandbox
      const paymentUrl = (preference as any).init_point || (preference as any).sandbox_init_point
      return { transaction: tx, preference, paymentUrl }
    } catch (error) {
      console.error('Erro ao criar pagamento de pedido:', error)
      throw error
    }
  }
}

// Instância singleton do serviço
let _mpService: MercadoPagoService | null = null
export function getMercadoPagoService(): MercadoPagoService {
  if (!_mpService) {
    _mpService = new MercadoPagoService()
  }
  return _mpService
}
