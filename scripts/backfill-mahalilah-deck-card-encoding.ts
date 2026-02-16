import { prisma } from "../packages/database/index";

type DeckCardRow = {
  id: string;
  deckId: string;
  cardNumber: number;
  description: string;
  keywords: string;
  observation: string | null;
};

type ProposedChange = {
  id: string;
  deckId: string;
  cardNumber: number;
  before: Pick<DeckCardRow, "description" | "keywords" | "observation">;
  after: Pick<DeckCardRow, "description" | "keywords" | "observation">;
};

function parseArgs(argv: string[]) {
  let apply = false;
  let deckId: string | null = null;
  let limit: number | null = null;
  let sample = 12;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg.startsWith("--deck-id=")) {
      deckId = arg.slice("--deck-id=".length).trim() || null;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) limit = Math.trunc(n);
      continue;
    }
    if (arg.startsWith("--sample=")) {
      const n = Number(arg.slice("--sample=".length));
      if (Number.isFinite(n) && n > 0) sample = Math.trunc(n);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { help: true as const, apply, deckId, limit, sample };
    }
  }

  return { help: false as const, apply, deckId, limit, sample };
}

function applyLegacyGlyphFixes(value: string) {
  return value
    .replace(/(?<=[A-Za-zÀ-ÿ])[Œœ](?=[A-Za-zÀ-ÿ])/g, "ê")
    .replace(/(^|[\s([{])([Øø])(?=$|[\s)\]}.,;:!?])/g, "$1é")
    .replace(/(?<=[A-Za-zÀ-ÿ])[Øø](?=[A-Za-zÀ-ÿ])/g, "é")
    .replace(/(?<!Ã)(?<=[A-Za-zÀ-ÿ])ª(?=[A-Za-zÀ-ÿ])/g, "ã");
}

function repairLikelyMojibakeChunks(value: string) {
  return value.replace(
    /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â[\u0080-\u00BF])+/g,
    (chunk) => {
      const decoded = Buffer.from(chunk, "latin1").toString("utf8");
      if (!decoded || /[\uFFFD]/.test(decoded)) return chunk;
      return decoded;
    },
  );
}

function scoreTextEncodingQuality(value: string) {
  const count = (regex: RegExp) => value.match(regex)?.length ?? 0;
  let score = 0;

  score -= count(/\uFFFD/g) * 60;
  score -= count(/Ã[\u0080-\u00BF]/g) * 14;
  score -= count(/Â[\u0080-\u00BF]/g) * 10;
  score -= count(/â[\u0080-\u00BF]/g) * 10;
  score -= count(/[\u0080-\u009F]/g) * 6;
  score -= count(/[ØøŒœ]/g) * 6;
  score += count(/[áàâãäéêëíïóôõöúüçÁÀÂÃÄÉÊËÍÏÓÔÕÖÚÜÇ]/g);

  return score;
}

function repairPtBrMojibake(value: string) {
  const source = (value || "").normalize("NFC");
  if (!source) return "";

  const original = applyLegacyGlyphFixes(source);
  const chunkRepaired = applyLegacyGlyphFixes(repairLikelyMojibakeChunks(source));
  const utf8Candidate = applyLegacyGlyphFixes(
    Buffer.from(source, "latin1").toString("utf8"),
  );

  const originalScore = scoreTextEncodingQuality(original);
  const chunkRepairedScore = scoreTextEncodingQuality(chunkRepaired);
  const utf8Score = scoreTextEncodingQuality(utf8Candidate);

  let best = original;
  let bestScore = originalScore;
  if (chunkRepairedScore > bestScore) {
    best = chunkRepaired;
    bestScore = chunkRepairedScore;
  }
  if (utf8Score > bestScore) {
    best = utf8Candidate;
  }
  return best.normalize("NFC");
}

function sanitizeText(value: string | null) {
  if (value == null) return null;
  return repairPtBrMojibake(value).trim();
}

function buildProposedChange(row: DeckCardRow): ProposedChange | null {
  const nextDescription = sanitizeText(row.description) || "";
  const nextKeywords = sanitizeText(row.keywords) || "";
  const nextObservation = sanitizeText(row.observation) || null;

  const changed =
    nextDescription !== row.description ||
    nextKeywords !== row.keywords ||
    nextObservation !== row.observation;

  if (!changed) return null;

  return {
    id: row.id,
    deckId: row.deckId,
    cardNumber: row.cardNumber,
    before: {
      description: row.description,
      keywords: row.keywords,
      observation: row.observation,
    },
    after: {
      description: nextDescription,
      keywords: nextKeywords,
      observation: nextObservation,
    },
  };
}

function printUsage() {
  console.log("Backfill de encoding dos textos de cartas do Maha Lilah");
  console.log("");
  console.log("Uso:");
  console.log("  pnpm exec tsx scripts/backfill-mahalilah-deck-card-encoding.ts [opções]");
  console.log("");
  console.log("Opções:");
  console.log("  --apply             Aplica alterações no banco (padrão é dry-run)");
  console.log("  --deck-id=<id>      Filtra um baralho específico");
  console.log("  --limit=<n>         Processa apenas os primeiros N registros");
  console.log("  --sample=<n>        Quantidade de exemplos exibidos (padrão: 12)");
  console.log("  --help, -h          Exibe esta ajuda");
}

function cut(value: string | null, max = 120) {
  if (value == null) return "null";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const where = args.deckId ? { deckId: args.deckId } : {};
  const pageSize = 200;
  const sample: ProposedChange[] = [];

  let cursor: { id: string } | undefined;
  let scanned = 0;
  let changed = 0;
  let applied = 0;
  let remainingLimit = args.limit;

  console.log(
    `[scan] mode=${args.apply ? "apply" : "dry-run"} deckId=${args.deckId ?? "ALL"} limit=${args.limit ?? "ALL"}`,
  );

  while (remainingLimit == null || remainingLimit > 0) {
    const take =
      remainingLimit == null
        ? pageSize
        : Math.min(pageSize, Math.max(remainingLimit, 0));

    if (take <= 0) break;

    const rows = (await prisma.cardDeckCard.findMany({
      where,
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { cursor, skip: 1 } : {}),
      select: {
        id: true,
        deckId: true,
        cardNumber: true,
        description: true,
        keywords: true,
        observation: true,
      },
    })) as DeckCardRow[];

    if (rows.length === 0) break;
    scanned += rows.length;
    remainingLimit = remainingLimit == null ? null : remainingLimit - rows.length;

    const batchChanges = rows
      .map(buildProposedChange)
      .filter((item): item is ProposedChange => item !== null);
    changed += batchChanges.length;

    for (const item of batchChanges) {
      if (sample.length < args.sample) sample.push(item);
    }

    if (args.apply && batchChanges.length > 0) {
      for (const item of batchChanges) {
        await prisma.cardDeckCard.update({
          where: { id: item.id },
          data: {
            description: item.after.description,
            keywords: item.after.keywords,
            observation: item.after.observation,
          },
        });
      }
      applied += batchChanges.length;
    }

    cursor = { id: rows[rows.length - 1].id };
  }

  console.log("");
  console.log(`[result] scanned=${scanned} changed=${changed} applied=${applied}`);

  if (sample.length > 0) {
    console.log("");
    console.log("[sample]");
    sample.forEach((item, index) => {
      console.log(
        `${index + 1}. deck=${item.deckId} carta=${item.cardNumber} id=${item.id}`,
      );
      if (item.before.description !== item.after.description) {
        console.log(`   description: "${cut(item.before.description)}"`);
        console.log(`            -> "${cut(item.after.description)}"`);
      }
      if (item.before.keywords !== item.after.keywords) {
        console.log(`   keywords:    "${cut(item.before.keywords)}"`);
        console.log(`            -> "${cut(item.after.keywords)}"`);
      }
      if (item.before.observation !== item.after.observation) {
        console.log(`   observation: "${cut(item.before.observation)}"`);
        console.log(`            -> "${cut(item.after.observation)}"`);
      }
    });
  }

  if (!args.apply && changed > 0) {
    console.log("");
    console.log(
      `Para aplicar as ${changed} correções: pnpm exec tsx scripts/backfill-mahalilah-deck-card-encoding.ts --apply${args.deckId ? ` --deck-id=${args.deckId}` : ""}${args.limit ? ` --limit=${args.limit}` : ""}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("[error] Falha no backfill de encoding:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
