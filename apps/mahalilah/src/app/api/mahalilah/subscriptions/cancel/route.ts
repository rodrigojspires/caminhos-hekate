import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";

type CancelRequestBody = {
  subscriptionId?: string;
};

function isMahaSubscription(metadata: unknown) {
  const parsed = (metadata || {}) as Record<string, any>;
  return parsed.app === "mahalilah";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CancelRequestBody;
    const requestedId =
      typeof body.subscriptionId === "string" ? body.subscriptionId : undefined;

    const target =
      requestedId
        ? await prisma.userSubscription.findUnique({
            where: { id: requestedId },
            include: { plan: { select: { name: true } } },
          })
        : (
            await prisma.userSubscription.findMany({
              where: {
                userId: session.user.id,
                status: {
                  in: ["PENDING", "ACTIVE", "TRIALING", "PAST_DUE", "PAUSED"],
                },
              },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { plan: { select: { name: true } } },
            })
          ).find((subscription) => isMahaSubscription(subscription.metadata));

    if (!target || target.userId !== session.user.id || !isMahaSubscription(target.metadata)) {
      return NextResponse.json(
        { error: "Assinatura Maha Lilah não encontrada." },
        { status: 404 },
      );
    }

    if (target.cancelAtPeriodEnd) {
      return NextResponse.json({
        success: true,
        alreadyCanceled: true,
        message: "Sua assinatura já está programada para cancelamento no vencimento.",
        activeUntil: target.currentPeriodEnd?.toISOString() || null,
      });
    }

    const now = new Date();
    const metadata = (target.metadata || {}) as Record<string, any>;

    const updated = await prisma.userSubscription.update({
      where: { id: target.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: now,
        metadata: {
          ...metadata,
          recurringEnabled: false,
          cancellation: {
            requestedAt: now.toISOString(),
            policy:
              "Sem reembolso. A assinatura permanece ativa até o fim do período já pago.",
          },
        },
      },
      include: { plan: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      message:
        "Assinatura cancelada com sucesso. Não haverá reembolso e o acesso seguirá até o vencimento.",
      activeUntil: updated.currentPeriodEnd?.toISOString() || null,
      subscription: {
        id: updated.id,
        planName: updated.plan?.name || "",
        status: updated.status,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        canceledAt: updated.canceledAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Erro ao cancelar assinatura Maha Lilah:", error);
    return NextResponse.json(
      { error: "Erro interno ao cancelar assinatura." },
      { status: 500 },
    );
  }
}
