import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export type ImportedCard = {
  cardNumber: number;
  description: string;
  keywords: string;
  observation: string | null;
};

export async function ensureAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { session };
}

function normalizeString(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string) {
  return normalizeString(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function getDeckImagesRoot() {
  const configured = process.env.DECK_IMAGES_ROOT?.trim();
  if (configured) return configured;
  return join(process.cwd(), "apps", "web", "private_uploads", "deck-images");
}

export async function ensureDeckImagesRoot() {
  const root = getDeckImagesRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export function validateDeckDirectoryName(directory: string) {
  const candidate = directory.trim();
  return /^[a-z0-9][a-z0-9_-]{1,79}$/i.test(candidate);
}

export function resolveDeckDirectoryPath(directory: string) {
  if (!validateDeckDirectoryName(directory)) {
    throw new Error("Diretório de baralho inválido");
  }
  return join(getDeckImagesRoot(), directory);
}

export async function createDeckDirectoryForName(name: string) {
  const root = await ensureDeckImagesRoot();
  const base = slugify(name) || "baralho";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const fullPath = join(root, candidate);
    if (existsSync(fullPath)) continue;
    try {
      await mkdir(fullPath, { recursive: false });
      return candidate;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "EEXIST") continue;
      throw error;
    }
  }

  throw new Error(
    "Não foi possível criar um diretório único para as imagens do baralho.",
  );
}

export function sanitizeUploadedFilename(filename: string) {
  const baseName = filename.split(/[\\/]/).pop()?.trim() || "";
  if (!baseName) return null;

  const sanitized = normalizeString(baseName)
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

  if (!sanitized || sanitized === "." || sanitized === "..") return null;
  return sanitized;
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCardNumber(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const integer = Math.trunc(n);
  if (integer <= 0) return null;
  return integer;
}

function parseRecord(record: Record<string, unknown>) {
  const normalized = new Map<string, unknown>();
  Object.entries(record).forEach(([key, value]) => {
    normalized.set(normalizeKey(key), value);
  });

  const cardNumber = parseCardNumber(
    normalized.get("cardnumber") ??
      normalized.get("numero") ??
      normalized.get("numeroCarta") ??
      normalized.get("numerocarta") ??
      normalized.get("carta") ??
      normalized.get("number"),
  );
  if (!cardNumber) return null;

  const descriptionValue =
    normalized.get("description") ??
    normalized.get("descritivo") ??
    normalized.get("descricao") ??
    normalized.get("texto");
  const description = String(descriptionValue || "").trim();
  if (!description) return null;

  const keywordsValue =
    normalized.get("keywords") ??
    normalized.get("palavrachave") ??
    normalized.get("palavraschave") ??
    normalized.get("keyword");
  const keywords = String(keywordsValue || "").trim();
  if (!keywords) return null;

  const observationValue =
    normalized.get("observation") ??
    normalized.get("observacao") ??
    normalized.get("obs");

  return {
    cardNumber,
    description,
    keywords,
    observation: String(observationValue || "").trim() || null,
  } satisfies ImportedCard;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

export function parseCardsFromCsv(content: string) {
  const lines = content
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [] as ImportedCard[];

  const headers = parseCsvLine(lines[0]);
  const parsed: ImportedCard[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    const entry = parseRecord(row);
    if (entry) parsed.push(entry);
  }

  return parsed;
}

export function parseCardsFromJson(content: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("JSON inválido");
  }

  const source = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { cards?: unknown[] }).cards)
      ? (payload as { cards: unknown[] }).cards
      : [];

  const parsed: ImportedCard[] = [];
  source.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const entry = parseRecord(item as Record<string, unknown>);
    if (entry) parsed.push(entry);
  });

  return parsed;
}

export function dedupeCards(cards: ImportedCard[]) {
  const byNumber = new Map<number, ImportedCard>();
  cards.forEach((card) => {
    byNumber.set(card.cardNumber, card);
  });
  return [...byNumber.values()].sort((a, b) => a.cardNumber - b.cardNumber);
}
