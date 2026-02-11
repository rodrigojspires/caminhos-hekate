import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@hekate/database";
import {
  dedupeCards,
  ensureAdminSession,
  parseCardsFromCsv,
  parseCardsFromJson,
} from "../../_lib";

interface RouteParams {
  params: { deckId: string };
}

const ImportSchema = z.object({
  format: z.enum(["json", "csv"]),
  content: z.string().min(1),
  replaceExisting: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const payload = await request.json();
    const data = ImportSchema.parse(payload);

    const parsedRaw =
      data.format === "json"
        ? parseCardsFromJson(data.content)
        : parseCardsFromCsv(data.content);
    const parsedCards = dedupeCards(parsedRaw);

    if (parsedCards.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma carta válida encontrada para importar." },
        { status: 400 },
      );
    }

    const summary = await prisma.$transaction(async (tx) => {
      if (data.replaceExisting) {
        await tx.cardDeckCard.deleteMany({ where: { deckId: deck.id } });
        await tx.cardDeckCard.createMany({
          data: parsedCards.map((card) => ({
            deckId: deck.id,
            cardNumber: card.cardNumber,
            description: card.description,
            keywords: card.keywords,
            observation: card.observation,
          })),
        });
        return {
          imported: parsedCards.length,
          inserted: parsedCards.length,
          updated: 0,
          mode: "replace",
        };
      }

      const existingCards = await tx.cardDeckCard.findMany({
        where: {
          deckId: deck.id,
          cardNumber: { in: parsedCards.map((card) => card.cardNumber) },
        },
        select: { cardNumber: true },
      });
      const existingNumbers = new Set(
        existingCards.map((card) => card.cardNumber),
      );

      const toInsert = parsedCards.filter(
        (card) => !existingNumbers.has(card.cardNumber),
      );
      const toUpdate = parsedCards.filter((card) =>
        existingNumbers.has(card.cardNumber),
      );

      if (toInsert.length > 0) {
        await tx.cardDeckCard.createMany({
          data: toInsert.map((card) => ({
            deckId: deck.id,
            cardNumber: card.cardNumber,
            description: card.description,
            keywords: card.keywords,
            observation: card.observation,
          })),
        });
      }

      for (const card of toUpdate) {
        await tx.cardDeckCard.update({
          where: {
            deckId_cardNumber: {
              deckId: deck.id,
              cardNumber: card.cardNumber,
            },
          },
          data: {
            description: card.description,
            keywords: card.keywords,
            observation: card.observation,
          },
        });
      }

      return {
        imported: parsedCards.length,
        inserted: toInsert.length,
        updated: toUpdate.length,
        mode: "upsert",
      };
    });

    return NextResponse.json({
      message: `Importação concluída no baralho ${deck.name}.`,
      ...summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "JSON inválido") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao importar cartas (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
