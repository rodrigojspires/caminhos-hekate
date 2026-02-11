import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@hekate/database";
import { ensureAdminSession } from "../../_lib";

interface RouteParams {
  params: { deckId: string };
}

const CreateCardSchema = z.object({
  cardNumber: z.coerce.number().int().min(1).max(9999),
  description: z.string().trim().min(1).max(5000),
  keywords: z.string().trim().min(1).max(1200),
  observation: z.string().trim().max(5000).optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const cards = await prisma.cardDeckCard.findMany({
      where: { deckId: deck.id },
      orderBy: { cardNumber: "asc" },
    });

    return NextResponse.json({ deck, cards });
  } catch (error) {
    console.error("Erro ao listar cartas (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const deck = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      select: { id: true },
    });
    if (!deck) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    const payload = await request.json();
    const data = CreateCardSchema.parse(payload);

    const card = await prisma.cardDeckCard.create({
      data: {
        deckId: deck.id,
        cardNumber: data.cardNumber,
        description: data.description,
        keywords: data.keywords,
        observation: data.observation?.trim() || null,
      },
    });

    return NextResponse.json({ card }, { status: 201 });
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
    console.error("Erro ao criar carta (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
