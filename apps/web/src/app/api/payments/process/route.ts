import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { rateLimit } from '@/lib/rate-limit'
// Import dinâmico dos provedores para evitar carregar SDKs no build

interface ProcessPaymentRequest {
  planId: string;
  provider: 'MERCADOPAGO' | 'ASAAS';
  paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'PIX';
  billingInterval?: 'MONTHLY' | 'YEARLY';
  customerData?: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = await rateLimit({ key: `pay:${ip}`, max: 30, windowSec: 60 })
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const body: ProcessPaymentRequest = await request.json();
    const { planId, provider, paymentMethod, customerData } = body;
    const billingInterval = (body.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY') as 'MONTHLY' | 'YEARLY'

    // Validações básicas
    if (!planId || !provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados obrigatórios não fornecidos',
        },
        { status: 400 }
      );
    }

    // Busca o plano de assinatura
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plano de assinatura não encontrado ou inativo',
        },
        { status: 404 }
      );
    }

    // Verifica se o usuário já tem uma assinatura ativa
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário já possui uma assinatura ativa',
        },
        { status: 400 }
      );
    }

    // Define valores conforme ciclo selecionado
    const amount = billingInterval === 'YEARLY'
      ? Number(plan.yearlyPrice ?? plan.monthlyPrice) // fallback se yearly não definido
      : Number(plan.monthlyPrice)

    const periodMs = billingInterval === 'YEARLY'
      ? (plan.intervalCount || 1) * 365 * 24 * 60 * 60 * 1000
      : (plan.intervalCount || 1) * 30 * 24 * 60 * 60 * 1000

    // Cria a assinatura pendente
    const subscription = await prisma.userSubscription.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        status: 'PENDING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodMs),
        metadata: {
          billingInterval,
        },
      },
    });

    let paymentResult: any;

    // Processa o pagamento baseado no provedor
    switch (provider) {
      case 'MERCADOPAGO': {
        const { MercadoPagoService } = await import('@/lib/payments/mercadopago')
        const mpService = new MercadoPagoService()
        paymentResult = await mpService.createSubscriptionPayment({
          amount,
          description: `Assinatura ${plan.name} (${billingInterval === 'YEARLY' ? 'anual' : 'mensal'})`,
          userId: session.user.id,
          subscriptionPlanId: plan.id,
          metadata: {
            subscription_id: subscription.id,
            payment_method: paymentMethod,
            billing_interval: billingInterval,
          },
        })
        break;
      }

      case 'ASAAS': {
        if (!customerData) {
          return NextResponse.json(
            {
              success: false,
              error: 'Dados do cliente são obrigatórios para pagamentos via Asaas',
            },
            { status: 400 }
          );
        }

        const asaasCustomerData = {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj,
          phone: customerData.phone,
          address: customerData.address?.street,
          addressNumber: customerData.address?.number,
          complement: customerData.address?.complement,
          province: customerData.address?.neighborhood,
          city: customerData.address?.city,
          state: customerData.address?.state,
          postalCode: customerData.address?.zipCode,
        };

        const { AsaasService } = await import('@/lib/payments/asaas')
        const asService = new AsaasService()
        paymentResult = await asService.createSubscriptionPayment(
          session.user.id,
          plan.id,
          asaasCustomerData,
          {
            amount,
            description: `Assinatura ${plan.name} (${billingInterval === 'YEARLY' ? 'anual' : 'mensal'})`,
            billingType: (paymentMethod === 'PIX' || paymentMethod === 'BOLETO' || paymentMethod === 'CREDIT_CARD') ? paymentMethod : 'BOLETO',
            metadata: {
              subscription_id: subscription.id,
              billing_interval: billingInterval,
            }
          }
        );
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Provedor de pagamento não suportado',
          },
          { status: 400 }
        );
    }

    // Atualiza a assinatura com o ID da transação
    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        payments: {
          connect: { id: paymentResult.transaction.id },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        transaction: paymentResult.transaction,
        paymentUrl: paymentResult.paymentUrl,
        provider,
        plan: {
          id: plan.id,
          name: plan.name,
          price: Number(plan.monthlyPrice),
          interval: plan.interval,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
