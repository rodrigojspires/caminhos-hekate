import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@hekate/database";
import { ensureAdminSession } from "../_lib";

interface RouteParams {
  params: { deckId: string };
}

const UpdateDeckSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    imageDirectory: z.string().trim().min(1).max(500).optional(),
    imageExtension: z
      .string()
      .trim()
      .min(1)
      .max(12)
      .transform((value) => value.replace(/^\./, "").toLowerCase())
      .optional(),
    useInMahaLilah: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo para atualizar.",
  });

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const deck = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      include: {
        _count: { select: { cards: true } },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      deck: {
        ...deck,
        cardsCount: deck._count.cards,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar baralho (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const payload = await request.json();
    const data = UpdateDeckSchema.parse(payload);

    const existing = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    const deck = await prisma.cardDeck.update({
      where: { id: params.deckId },
      data,
    });

    return NextResponse.json({ deck });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Erro ao atualizar baralho (admin):", error);
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

    const deck = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      select: { id: true, name: true },
    });
    if (!deck) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    await prisma.cardDeck.delete({ where: { id: deck.id } });
    return NextResponse.json({
      message: `Baralho ${deck.name} excluído com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir baralho (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
