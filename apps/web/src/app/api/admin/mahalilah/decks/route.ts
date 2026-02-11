import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@hekate/database";
import { createDeckDirectoryForName, ensureAdminSession } from "./_lib";

export const runtime = "nodejs";

const CreateDeckSchema = z.object({
  name: z.string().trim().min(2).max(120),
  imageExtension: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .default("jpg")
    .transform((value) => value.replace(/^\./, "").toLowerCase()),
  useInMahaLilah: z.boolean().default(false),
});

export async function GET() {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const decks = await prisma.cardDeck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { cards: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      decks: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        imageDirectory: deck.imageDirectory,
        imageExtension: deck.imageExtension,
        useInMahaLilah: deck.useInMahaLilah,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        createdBy: deck.createdBy,
        cardsCount: deck._count.cards,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar baralhos (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const payload = await request.json();
    const data = CreateDeckSchema.parse(payload);
    const directory = await createDeckDirectoryForName(data.name);

    const deck = await prisma.cardDeck.create({
      data: {
        name: data.name,
        imageDirectory: directory,
        imageExtension: data.imageExtension,
        useInMahaLilah: data.useInMahaLilah,
        createdByUserId: auth.session.user.id,
      },
    });

    return NextResponse.json({ deck }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Erro ao criar baralho (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
