import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@hekate/database";
import { ensureAdminSession } from "../../../_lib";

interface RouteParams {
  params: { deckId: string; cardId: string };
}

const UpdateCardSchema = z
  .object({
    cardNumber: z.coerce.number().int().min(1).max(9999).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    keywords: z.string().trim().min(1).max(1200).optional(),
    observation: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo para atualizar.",
  });

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const payload = await request.json();
    const data = UpdateCardSchema.parse(payload);

    const card = await prisma.cardDeckCard.findFirst({
      where: { id: params.cardId, deckId: params.deckId },
      select: { id: true },
    });
    if (!card) {
      return NextResponse.json(
        { error: "Carta não encontrada" },
        { status: 404 },
      );
    }

    const updated = await prisma.cardDeckCard.update({
      where: { id: params.cardId },
      data: {
        ...(data.cardNumber !== undefined
          ? { cardNumber: data.cardNumber }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.keywords !== undefined ? { keywords: data.keywords } : {}),
        ...(data.observation !== undefined
          ? { observation: data.observation?.trim() || null }
          : {}),
      },
    });

    return NextResponse.json({ card: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe uma carta com este número neste baralho." },
        { status: 409 },
      );
    }
    console.error("Erro ao atualizar carta (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const card = await prisma.cardDeckCard.findFirst({
      where: { id: params.cardId, deckId: params.deckId },
      select: { id: true, cardNumber: true },
    });
    if (!card) {
      return NextResponse.json(
        { error: "Carta não encontrada" },
        { status: 404 },
      );
    }

    await prisma.cardDeckCard.delete({
      where: { id: card.id },
    });

    return NextResponse.json({
      message: `Carta #${card.cardNumber} excluída com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir carta (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
