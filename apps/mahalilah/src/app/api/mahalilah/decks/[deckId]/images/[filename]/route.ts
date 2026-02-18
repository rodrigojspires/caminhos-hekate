import { NextResponse } from "next/server";
import { prisma } from "@hekate/database";
import { readFile } from "fs/promises";
import { join } from "path";

interface RouteParams {
  params: { deckId: string; filename: string };
}

function getDeckImagesRoot() {
  const configured = process.env.DECK_IMAGES_ROOT?.trim();
  if (configured) return configured;
  return join(
    process.cwd(),
    "apps",
    "mahalilah",
    "private_uploads",
    "deck-images",
  );
}

function isSafeSegment(value: string) {
  return /^[a-z0-9][a-z0-9_-]{1,79}$/i.test(value);
}

function isSafeFilename(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,120}$/i.test(value);
}

function getMimeType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    if (!isSafeFilename(params.filename)) {
      return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
    }

    const deck = await prisma.cardDeck.findUnique({
      where: { id: params.deckId },
      select: { imageDirectory: true },
    });
    if (!deck || !isSafeSegment(deck.imageDirectory)) {
      return NextResponse.json(
        { error: "Baralho não encontrado" },
        { status: 404 },
      );
    }

    const fullPath = join(
      getDeckImagesRoot(),
      deck.imageDirectory,
      params.filename,
    );
    const data = await readFile(fullPath);

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": getMimeType(params.filename),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Imagem não encontrada" },
      { status: 404 },
    );
  }
}
