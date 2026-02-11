import { NextRequest, NextResponse } from "next/server";
import { readdir, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@hekate/database";
import {
  ensureAdminSession,
  resolveDeckDirectoryPath,
  sanitizeUploadedFilename,
} from "../../_lib";

interface RouteParams {
  params: { deckId: string };
}

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensureAdminSession();
    if (auth.error) return auth.error;

    const deck = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      select: { id: true, imageDirectory: true },
    });
    if (!deck) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    const directory = resolveDeckDirectoryPath(deck.imageDirectory);
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Erro ao listar imagens do baralho:", error);
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
      select: { id: true, imageDirectory: true },
    });
    if (!deck) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 },
      );
    }

    const directory = resolveDeckDirectoryPath(deck.imageDirectory);
    await mkdir(directory, { recursive: true });

    const uploaded: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      if (file.size <= 0) {
        skipped.push(file.name || "(arquivo vazio)");
        continue;
      }
      if (file.type && !file.type.startsWith("image/")) {
        skipped.push(file.name);
        continue;
      }

      const safeName = sanitizeUploadedFilename(file.name);
      if (!safeName) {
        skipped.push(file.name || "(nome inválido)");
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(directory, safeName), buffer);
      uploaded.push(safeName);
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum arquivo válido foi enviado.",
          skipped,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      uploaded,
      skipped,
      message: `${uploaded.length} arquivo(s) enviado(s) com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao enviar imagens do baralho:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
