import { prisma } from '@hekate/database';

export interface AsaasCustomerData {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface AsaasPaymentData {
  customer: string; // ID do cliente no Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value?: number;
    dueDateLimitDays?: number;
  };
  interest?: {
    value?: number;
  };
  fine?: {
    value?: number;
  };
}

export interface AsaasSubscriptionData {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
}

export class AsaasService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    if (!process.env.ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY is required');
    }

    this.apiKey = process.env.ASAAS_API_KEY;
    this.baseUrl = process.env.ASAAS_ENVIRONMENT === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  /**
   * Faz requisição para API do Asaas
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(`Asaas API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cria um cliente no Asaas
   */
  async createCustomer(data: AsaasCustomerData) {
    try {
      const customer = await this.makeRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return customer;
    } catch (error) {
      console.error('Erro ao criar cliente Asaas:', error);
      throw new Error('Falha ao criar cliente');
    }
  }

  /**
   * Busca um cliente no Asaas
   */
  async getCustomer(customerId: string) {
    try {
      const customer = await this.makeRequest(`/customers/${customerId}`);
      return customer;
    } catch (error) {
      console.error('Erro ao buscar cliente Asaas:', error);
      throw new Error('Falha ao buscar cliente');
    }
  }

  /**
   * Cria uma cobrança no Asaas
   */
  async createPayment(data: AsaasPaymentData) {
    try {
      const payment = await this.makeRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return payment;
    } catch (error) {
      console.error('Erro ao criar cobrança Asaas:', error);
      throw new Error('Falha ao criar cobrança');
    }
  }

  /**
   * Busca uma cobrança no Asaas
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await this.makeRequest(`/payments/${paymentId}`);
      return payment;
    } catch (error) {
      console.error('Erro ao buscar cobrança Asaas:', error);
      throw new Error('Falha ao buscar cobrança');
    }
  }

  /**
   * Cria uma assinatura no Asaas
   */
  async createSubscription(data: AsaasSubscriptionData) {
    try {
      const subscription = await this.makeRequest('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao criar assinatura Asaas:', error);
      throw new Error('Falha ao criar assinatura');
    }
  }

  /**
   * Busca uma assinatura no Asaas
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.makeRequest(`/subscriptions/${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('Erro ao buscar assinatura Asaas:', error);
      throw new Error('Falha ao buscar assinatura');
    }
  }

  /**
   * Cancela uma assinatura no Asaas
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const result = await this.makeRequest(`/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      return result;
    } catch (error) {
      console.error('Erro ao cancelar assinatura Asaas:', error);
      throw new Error('Falha ao cancelar assinatura');
    }
  }

  /**
   * Processa webhook do Asaas
   */
  async processWebhook(data: any) {
    try {
      const { event, payment } = data;

      switch (event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentSuccess(payment);
          break;
        case 'PAYMENT_OVERDUE':
        case 'PAYMENT_DELETED':
          await this.handlePaymentFailure(payment);
          break;
        case 'PAYMENT_REFUNDED':
          await this.handlePaymentRefund(payment);
          break;
        default:
          console.log('Evento não tratado:', event);
      }

      return { success: true, event };
    } catch (error) {
      console.error('Erro ao processar webhook Asaas:', error);
      throw new Error('Falha ao processar webhook');
    }
  }

  /**
   * Trata pagamento bem-sucedido
   */
  private async handlePaymentSuccess(payment: any) {
    try {
      const transaction = await prisma.paymentTransaction.update({
        where: {
          providerPaymentId: payment.id,
        },
        data: {
          status: 'COMPLETED',
          metadata: {
            asaas_status: payment.status,
            asaas_payment_date: payment.paymentDate,
            asaas_billing_type: payment.billingType,
          },
        },
      });

      // Se o pagamento foi para uma assinatura, ativa ela
      if (transaction.subscriptionId) {
        await this.activateSubscription(transaction.subscriptionId);
      }

      return transaction;
    } catch (error) {
      console.error('Erro ao processar pagamento bem-sucedido:', error);
      throw error;
    }
  }

  /**
   * Trata falha no pagamento
   */
  private async handlePaymentFailure(payment: any) {
    try {
      const transaction = await prisma.paymentTransaction.update({
        where: {
          providerPaymentId: payment.id,
        },
        data: {
          status: 'FAILED',
          metadata: {
            asaas_status: payment.status,
            asaas_billing_type: payment.billingType,
          },
        },
      });

      return transaction;
    } catch (error) {
      console.error('Erro ao processar falha no pagamento:', error);
      throw error;
    }
  }

  /**
   * Trata reembolso do pagamento
   */
  private async handlePaymentRefund(payment: any) {
    try {
      const transaction = await prisma.paymentTransaction.update({
        where: {
          providerPaymentId: payment.id,
        },
        data: {
          status: 'CANCELED',
          metadata: {
            asaas_status: payment.status,
            asaas_refund_date: payment.refundDate,
            asaas_billing_type: payment.billingType,
          },
        },
      });

      // Se o pagamento foi para uma assinatura, cancela ela
      if (transaction.subscriptionId) {
        await this.cancelUserSubscription(transaction.subscriptionId);
      }

      return transaction;
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
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
      // Atualiza tier do usuário
      try {
        if (updated.plan?.tier) {
          await prisma.user.update({ where: { id: updated.userId }, data: { subscriptionTier: updated.plan.tier as any } })
        }
      } catch (e) {
        console.error('Erro ao atualizar subscriptionTier do usuário (Asaas):', e)
      }
    } catch (error) {
      console.error('Erro ao ativar assinatura:', error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura do usuário
   */
  private async cancelUserSubscription(subscriptionId: string) {
    try {
      const canceled = await prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
        },
      });
      try {
        await prisma.user.update({ where: { id: canceled.userId }, data: { subscriptionTier: 'FREE' as any } })
      } catch (e) {
        console.error('Erro ao definir usuário como FREE (Asaas cancel):', e)
      }
      try {
        const { revokeSubscriptionDownloads } = await import('@/lib/downloads')
        await revokeSubscriptionDownloads(canceled.userId, canceled.planId)
      } catch (e) {
        console.error('Erro ao revogar downloads de assinatura (Asaas cancel):', e)
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura do usuário:', error);
      throw error;
    }
  }

  /**
   * Cria uma cobrança para assinatura
   */
  async createSubscriptionPayment(
    userId: string,
    planId: string,
    customerData: AsaasCustomerData,
    options?: { amount?: number; description?: string; billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX'; metadata?: Record<string, any> }
  ) {
    try {
      // Busca o plano
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      // Cria ou busca cliente no Asaas
      const customer = await this.createCustomer(customerData);

      // Cria a transação no banco
      const value = options?.amount ?? Number(plan.monthlyPrice)
      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId,
          amount: value,
          currency: 'BRL',
          provider: 'ASAAS',
          status: 'PENDING',
          metadata: {
            description: options?.description ?? `Assinatura ${plan.name}`,
            ...(options?.metadata || {}),
          },
        },
      });

      // Calcula data de vencimento (7 dias a partir de hoje)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Cria a cobrança no Asaas
      const payment = await this.createPayment({
        customer: customer.id,
        billingType: options?.billingType ?? 'BOLETO',
        value,
        dueDate: dueDate.toISOString().split('T')[0],
        description: options?.description ?? `Assinatura ${plan.name}`,
        externalReference: transaction.id,
      });

      // Atualiza a transação com o ID do Asaas
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          providerPaymentId: payment.id,
        },
      });

      return {
        transaction,
        payment,
        paymentUrl: payment.bankSlipUrl || payment.invoiceUrl,
      };
    } catch (error) {
      console.error('Erro ao criar pagamento de assinatura Asaas:', error);
      throw new Error('Falha ao criar pagamento');
    }
  }
}

// Instância singleton do serviço
let _asaasService: AsaasService | null = null
export function getAsaasService(): AsaasService {
  if (!_asaasService) {
    _asaasService = new AsaasService()
  }
  return _asaasService
}
