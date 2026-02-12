import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma, prisma } from "@hekate/database";

type PaymentMetadata = {
  description?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  lineItems?: Array<{ label: string; amount: number }>;
};

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
          subscription: {
            select: {
              id: true,
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
