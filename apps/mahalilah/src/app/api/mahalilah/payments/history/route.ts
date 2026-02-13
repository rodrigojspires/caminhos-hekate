import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma, prisma } from "@hekate/database";

export const dynamic = "force-dynamic";

type PaymentMetadata = {
  description?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  planType?: string;
  billingInterval?: string;
  billingReason?: string;
  lineItems?: Array<{ label: string; amount: number }>;
};

function formatPlanType(planType?: string | null) {
  if (planType === "SUBSCRIPTION") return "Assinatura ilimitada";
  if (planType === "SUBSCRIPTION_LIMITED") return "Assinatura limitada";
  if (planType === "SINGLE_SESSION") return "Sessão avulsa";
  return null;
}

function buildReasonLabel(params: {
  planType?: string | null;
  orderId?: string | null;
  subscriptionId?: string | null;
  fallbackDescription?: string;
}) {
  if (params.planType === "SINGLE_SESSION" || params.orderId) {
    return "Compra avulsa";
  }

  if (
    params.planType === "SUBSCRIPTION" ||
    params.planType === "SUBSCRIPTION_LIMITED" ||
    params.subscriptionId
  ) {
    return "Plano";
  }

  return params.fallbackDescription || "Pagamento";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100,
    );
    const skip = (page - 1) * limit;
    const userId = session.user.id;

    const where: Prisma.PaymentTransactionWhereInput = {
      userId,
    };

    const [payments, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              metadata: true,
            },
          },
          subscription: {
            select: {
              id: true,
              metadata: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return NextResponse.json({
      payments: payments.map((payment) => {
        const metadata = (payment.metadata || {}) as PaymentMetadata;
        const subscriptionMetadata = (payment.subscription?.metadata ||
          {}) as Record<string, any>;
        const subscriptionMahaMetadata = (subscriptionMetadata?.mahalilah ||
          {}) as Record<string, any>;
        const orderMetadata = ((payment.order?.metadata as Record<string, any>) ||
          {}) as Record<string, any>;
        const orderMahaMetadata = (orderMetadata?.mahalilah ||
          {}) as Record<string, any>;
        const planType =
          metadata.planType ||
          subscriptionMahaMetadata.planType ||
          orderMahaMetadata.planType ||
          null;
        const billingInterval =
          metadata.billingInterval ||
          subscriptionMetadata.billingInterval ||
          subscriptionMahaMetadata.billingInterval ||
          null;
        const billingReason =
          metadata.billingReason && typeof metadata.billingReason === "string"
            ? metadata.billingReason
            : null;
        const reasonLabel = buildReasonLabel({
          planType,
          orderId: payment.orderId,
          subscriptionId: payment.subscriptionId,
          fallbackDescription: metadata.description,
        });

        return {
          id: payment.id,
          amount: Number(payment.amount || 0),
          status: payment.status,
          paymentMethod: payment.paymentMethod || "PIX",
          provider: payment.provider || "MERCADOPAGO",
          description: metadata.description || "",
          invoiceUrl: payment.boletoUrl || metadata.invoiceUrl || undefined,
          receiptUrl: metadata.receiptUrl || undefined,
          lineItems: Array.isArray(metadata.lineItems)
            ? metadata.lineItems
            : undefined,
          reasonKind: planType,
          reasonLabel,
          planLabel:
            payment.subscription?.plan?.name ||
            subscriptionMahaMetadata.label ||
            orderMahaMetadata.label ||
            formatPlanType(planType) ||
            undefined,
          billingInterval: billingInterval || undefined,
          billingReason: billingReason || undefined,
          validityStart: payment.subscription?.currentPeriodStart?.toISOString(),
          validityEnd: payment.subscription?.currentPeriodEnd?.toISOString(),
          createdAt: payment.createdAt.toISOString(),
          paidAt: payment.paidAt?.toISOString(),
          subscription: payment.subscription
            ? {
                id: payment.subscription.id,
                plan: { name: payment.subscription.plan?.name || "" },
              }
            : undefined,
        };
      }),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Erro ao buscar histórico de pagamentos (Maha Lilah):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
