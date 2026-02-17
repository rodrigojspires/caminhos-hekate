import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { prisma } from "@hekate/database";
import {
  applyMove,
  isCompleted,
  START_INDEX,
  getHouseByNumber,
} from "@hekate/mahalilah-core";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PORT = Number(process.env.MAHALILAH_REALTIME_PORT || 4010);
const CLIENT_URL =
  process.env.NEXT_PUBLIC_MAHALILAH_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";
const CLIENT_URLS = (process.env.MAHALILAH_CLIENT_URLS || CLIENT_URL)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const SOCKET_SECRET =
  process.env.MAHALILAH_SOCKET_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "mahalilah-secret";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_DEV_REDIS_URL = "redis://localhost:6379";
const REDIS_URL =
  process.env.REDIS_URL ||
  (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_REDIS_URL : undefined);
const USER_SESSION_TTL_MS = Number(
  process.env.MAHALILAH_USER_SESSION_TTL_MS || 90_000,
);
const USER_SESSION_HEARTBEAT_MS = Number(
  process.env.MAHALILAH_USER_SESSION_HEARTBEAT_MS || 25_000,
);
const REALTIME_INSTANCE_ID =
  process.env.MAHALILAH_REALTIME_INSTANCE_ID || randomUUID();
const USER_ACTIVE_SESSION_KEY_PREFIX = "mahalilah:realtime:user-active-session";

if (!REDIS_URL) {
  throw new Error(
    "REDIS_URL não configurada para o realtime do Maha Lilah. Configure REDIS_URL para garantir sessão única por usuário.",
  );
}

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (attempt: number) => Math.min(attempt * 100, 2000),
  reconnectOnError: () => true,
});

redis.on("error", (error: unknown) => {
  console.error("[mahalilah-realtime][redis] erro de conexão:", error);
});

let redisConnectPromise: Promise<void> | null = null;

const ROLL_COOLDOWN_MS = Number(process.env.MAHALILAH_ROLL_COOLDOWN_MS || 1200);
const AI_COOLDOWN_MS = Number(process.env.MAHALILAH_AI_COOLDOWN_MS || 4000);
const DECK_COOLDOWN_MS = Number(process.env.MAHALILAH_DECK_COOLDOWN_MS || 800);
const THERAPY_COOLDOWN_MS = Number(
  process.env.MAHALILAH_THERAPY_COOLDOWN_MS || 800,
);
const PLAN_LIMITS_CACHE_TTL_MS = Number(
  process.env.MAHALILAH_PLAN_LIMITS_CACHE_TTL_MS || 30_000,
);
const TRIAL_POST_START_MOVE_LIMIT = Number(
  process.env.MAHALILAH_TRIAL_POST_START_MOVE_LIMIT || 5,
);
const TRIAL_AI_TIPS_LIMIT = 1;
const TRIAL_AI_SUMMARY_LIMIT = 1;
const TRIAL_PROGRESS_SUMMARY_EVERY_MOVES = Number(
  process.env.MAHALILAH_TRIAL_PROGRESS_SUMMARY_EVERY_MOVES || 15,
);
const PLAYER_INTENTION_MAX_LENGTH = Number(
  process.env.MAHALILAH_PLAYER_INTENTION_MAX_LENGTH || 280,
);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
  },
});

type AuthedSocket = Parameters<typeof io.on>[1] & {
  data: {
    user?: {
      id: string;
      email: string;
      name?: string | null;
      role?: string | null;
    };
    roomId?: string;
  };
};

const actionCooldowns = new Map<string, number>();
const roomUserConnections = new Map<string, Map<string, number>>();
let planAiLimitsCache: {
  expiresAt: number;
  byPlanType: Map<
    string,
    {
      tipsPerPlayer: number;
      summaryLimit: number;
      progressSummaryEveryMoves: number;
    }
  >;
} = {
  expiresAt: 0,
  byPlanType: new Map(),
};

function enforceCooldown(key: string, cooldownMs: number) {
  if (!cooldownMs || cooldownMs <= 0) return;
  const now = Date.now();
  const last = actionCooldowns.get(key) || 0;
  if (now - last < cooldownMs) {
    throw new Error("Aguarde um instante para repetir esta ação");
  }
  actionCooldowns.set(key, now);
}

function randomDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function isPostStartMove(move: {
  fromPos: number;
  toPos: number;
  diceValue: number;
}) {
  return !(move.fromPos === 68 && move.toPos === 68 && move.diceValue !== 6);
}

function buildCardImageUrl(
  deckId: string,
  imageExtension: string,
  cardNumber: number,
) {
  const normalizedExtension = imageExtension.replace(/^\./, "");
  return `/api/mahalilah/decks/${deckId}/images/${cardNumber}.${normalizedExtension}`;
}

function addRoomConnection(roomId: string, userId: string) {
  const users = roomUserConnections.get(roomId) || new Map<string, number>();
  users.set(userId, (users.get(userId) || 0) + 1);
  roomUserConnections.set(roomId, users);
}

function removeRoomConnection(roomId: string, userId: string) {
  const users = roomUserConnections.get(roomId);
  if (!users) return;
  const current = users.get(userId) || 0;
  if (current <= 1) {
    users.delete(userId);
  } else {
    users.set(userId, current - 1);
  }
  if (users.size === 0) {
    roomUserConnections.delete(roomId);
  }
}

function hasTherapistOnline(
  roomId: string,
  participants: Array<{ role: string; userId: string }>,
) {
  const users = roomUserConnections.get(roomId);
  if (!users || users.size === 0) return false;
  return participants.some(
    (participant) =>
      participant.role === "THERAPIST" &&
      (users.get(participant.userId) || 0) > 0,
  );
}

function buildSocketError(message: string, code?: string) {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}

function buildUserActiveSessionKey(userId: string) {
  return `${USER_ACTIVE_SESSION_KEY_PREFIX}:${userId}`;
}

async function ensureRedisConnected() {
  if (redis.status === "ready" || redis.status === "connect") return;
  if (redis.status === "connecting" || redis.status === "reconnecting") return;
  if (!redisConnectPromise) {
    redisConnectPromise = redis
      .connect()
      .catch((error: unknown) => {
        const message = String((error as any)?.message || "");
        if (message.includes("already connecting/connected")) return;
        throw error;
      })
      .finally(() => {
        redisConnectPromise = null;
      });
  }
  await redisConnectPromise;
}

type ClaimUserSessionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      existingRoomId: string | null;
      existingSocketId: string | null;
    };

async function claimUserActiveSession(
  userId: string,
  roomId: string,
  socketId: string,
): Promise<ClaimUserSessionResult> {
  await ensureRedisConnected();
  const key = buildUserActiveSessionKey(userId);
  const raw = await redis.eval(
    `
      local key = KEYS[1]
      local socketId = ARGV[1]
      local roomId = ARGV[2]
      local instanceId = ARGV[3]
      local updatedAt = ARGV[4]
      local ttlMs = tonumber(ARGV[5])

      if redis.call('EXISTS', key) == 0 then
        redis.call('HSET', key,
          'socketId', socketId,
          'roomId', roomId,
          'instanceId', instanceId,
          'updatedAt', updatedAt
        )
        redis.call('PEXPIRE', key, ttlMs)
        return {1, '', ''}
      end

      local existingSocketId = redis.call('HGET', key, 'socketId')
      if existingSocketId == socketId then
        redis.call('HSET', key,
          'socketId', socketId,
          'roomId', roomId,
          'instanceId', instanceId,
          'updatedAt', updatedAt
        )
        redis.call('PEXPIRE', key, ttlMs)
        return {1, '', ''}
      end

      local existingRoomId = redis.call('HGET', key, 'roomId') or ''
      return {0, existingRoomId, existingSocketId or ''}
    `,
    1,
    key,
    socketId,
    roomId,
    REALTIME_INSTANCE_ID,
    new Date().toISOString(),
    String(USER_SESSION_TTL_MS),
  );

  const normalized = Array.isArray(raw) ? raw : [raw];
  const allowed = Number(normalized[0]) === 1;
  if (allowed) {
    return { ok: true };
  }

  const existingRoomIdRaw = normalized[1];
  const existingSocketIdRaw = normalized[2];
  return {
    ok: false,
    existingRoomId: existingRoomIdRaw ? String(existingRoomIdRaw) : null,
    existingSocketId: existingSocketIdRaw ? String(existingSocketIdRaw) : null,
  };
}

async function refreshUserActiveSession(
  userId: string,
  socketId: string,
  roomId: string,
) {
  await ensureRedisConnected();
  const key = buildUserActiveSessionKey(userId);
  await redis.eval(
    `
      local key = KEYS[1]
      local socketId = ARGV[1]
      local roomId = ARGV[2]
      local updatedAt = ARGV[3]
      local ttlMs = tonumber(ARGV[4])

      if redis.call('EXISTS', key) == 0 then
        return 0
      end

      local existingSocketId = redis.call('HGET', key, 'socketId')
      if existingSocketId ~= socketId then
        return 0
      end

      redis.call('HSET', key,
        'roomId', roomId,
        'updatedAt', updatedAt
      )
      redis.call('PEXPIRE', key, ttlMs)
      return 1
    `,
    1,
    key,
    socketId,
    roomId,
    new Date().toISOString(),
    String(USER_SESSION_TTL_MS),
  );
}

async function releaseUserActiveSession(userId: string, socketId: string) {
  await ensureRedisConnected();
  const key = buildUserActiveSessionKey(userId);
  await redis.eval(
    `
      local key = KEYS[1]
      local socketId = ARGV[1]

      if redis.call('EXISTS', key) == 0 then
        return 1
      end

      local existingSocketId = redis.call('HGET', key, 'socketId')
      if existingSocketId == socketId then
        redis.call('DEL', key)
        return 1
      end

      return 0
    `,
    1,
    key,
    socketId,
  );
}

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Você é um terapeuta que utiliza o jogo Maha Lilah para facilitar insights simbólicos e reflexões profundas. Responda em português, de modo claro, acolhedor e sempre conectando as respostas ao significado simbólico de cada casa no tabuleiro.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro OpenAI: ${text}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content?.trim() || "Sem resposta.";
}

async function buildAiContext(roomId: string, participantId: string) {
  const participant = await prisma.mahaLilahParticipant.findUnique({
    where: { id: participantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!participant) throw new Error("Participante não encontrado");

  const [playerState, moves, therapyEntries] = await Promise.all([
    prisma.mahaLilahPlayerState.findFirst({ where: { roomId, participantId } }),
    prisma.mahaLilahMove.findMany({
      where: { roomId, participantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.mahaLilahTherapyEntry.findMany({
      where: { roomId, participantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const path = moves
    .filter(isPostStartMove)
    .map((move) => move.toPos)
    .reverse();

  const counts: Record<string, number> = {};
  path.forEach((house) => {
    counts[house] = (counts[house] || 0) + 1;
  });

  const currentHouse = playerState ? playerState.position + 1 : 68;
  const houseMeta = getHouseByNumber(currentHouse);

  return {
    participant: {
      id: participant.user.id,
      name: participant.user.name || participant.user.email,
    },
    currentHouse: houseMeta
      ? {
          number: houseMeta.number,
          title: houseMeta.title,
          description: houseMeta.description,
        }
      : { number: currentHouse },
    path,
    repeats: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([house, count]) => ({ house: Number(house), count })),
    recentMoves: moves.map((move) => ({
      dice: move.diceValue,
      from: move.fromPos,
      to: move.toPos,
      jump: move.appliedJumpFrom
        ? `${move.appliedJumpFrom}→${move.appliedJumpTo}`
        : null,
    })),
    therapyEntries: therapyEntries.map((entry) => ({
      emotion: entry.emotion,
      intensity: entry.intensity,
      insight: entry.insight,
      body: entry.body,
      microAction: entry.microAction,
    })),
  };
}

async function loadPlanAiLimitsByType() {
  const now = Date.now();
  if (
    planAiLimitsCache.byPlanType.size > 0 &&
    planAiLimitsCache.expiresAt > now
  ) {
    return planAiLimitsCache.byPlanType;
  }

  const plans = await prisma.mahaLilahPlan.findMany({
    where: {
      isActive: true,
      planType: { in: ["SINGLE_SESSION", "SUBSCRIPTION", "SUBSCRIPTION_LIMITED"] },
    },
    select: {
      planType: true,
      tipsPerPlayer: true,
      summaryLimit: true,
      progressSummaryEveryMoves: true,
    },
  });

  const byPlanType = new Map<
    string,
    {
      tipsPerPlayer: number;
      summaryLimit: number;
      progressSummaryEveryMoves: number;
    }
  >();

  plans.forEach((plan) => {
    byPlanType.set(plan.planType, {
      tipsPerPlayer: Number(plan.tipsPerPlayer || 0),
      summaryLimit: Number(plan.summaryLimit || 0),
      progressSummaryEveryMoves: Number(plan.progressSummaryEveryMoves || 0),
    });
  });

  planAiLimitsCache = {
    byPlanType,
    expiresAt: now + PLAN_LIMITS_CACHE_TTL_MS,
  };

  return byPlanType;
}

async function getDefaultAiLimitsForPlan(planType: string) {
  const byPlanType = await loadPlanAiLimitsByType();
  const limits = byPlanType.get(planType);

  if (!limits) {
    throw new Error(`Plano ${planType} sem configuração de IA no catálogo`);
  }

  return limits;
}

function isTrialRoom(room: {
  isTrial?: boolean | null;
}) {
  return Boolean(room.isTrial);
}

function parseSubscriptionMahaMetadata(raw: unknown) {
  const metadata = raw as any;
  if (!metadata || typeof metadata !== "object") return null;
  if (metadata.app !== "mahalilah") return null;
  if (!metadata.mahalilah || typeof metadata.mahalilah !== "object") return null;
  return metadata.mahalilah as {
    planType?: string;
    tipsPerPlayer?: number;
    summaryLimit?: number;
    progressSummaryEveryMoves?: number;
    durationDays?: number;
  };
}

function isSubscriptionStillActive(currentPeriodEnd: Date | null) {
  if (!currentPeriodEnd) return true;
  return currentPeriodEnd.getTime() >= Date.now();
}

async function getRoomAiLimits(room: {
  id: string;
  planType: string;
  orderId: string | null;
  isTrial?: boolean | null;
  subscriptionId?: string | null;
  createdByUserId: string;
}) {
  if (isTrialRoom(room)) {
    return {
      tipsLimit: TRIAL_AI_TIPS_LIMIT,
      summaryLimit: TRIAL_AI_SUMMARY_LIMIT,
      progressSummaryEveryMoves: TRIAL_PROGRESS_SUMMARY_EVERY_MOVES,
    };
  }

  const defaults = await getDefaultAiLimitsForPlan(room.planType);
  let tipsLimit = defaults.tipsPerPlayer;
  let summaryLimit = defaults.summaryLimit;
  let progressSummaryEveryMoves = defaults.progressSummaryEveryMoves;

  if (room.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: room.orderId },
      select: { metadata: true },
    });
    const meta = (order?.metadata as any)?.mahalilah;
    if (meta?.tipsPerPlayer != null) {
      const parsed = Number(meta.tipsPerPlayer);
      if (Number.isFinite(parsed) && parsed >= 0) tipsLimit = parsed;
    }
    if (meta?.summaryLimit != null) {
      const parsed = Number(meta.summaryLimit);
      if (Number.isFinite(parsed) && parsed >= 0) summaryLimit = parsed;
    }
    if (meta?.progressSummaryEveryMoves != null) {
      const parsed = Number(meta.progressSummaryEveryMoves);
      if (Number.isFinite(parsed) && parsed >= 0) {
        progressSummaryEveryMoves = parsed;
      }
    }
    return { tipsLimit, summaryLimit, progressSummaryEveryMoves };
  }

  if (room.planType !== "SUBSCRIPTION" && room.planType !== "SUBSCRIPTION_LIMITED") {
    return { tipsLimit, summaryLimit, progressSummaryEveryMoves };
  }

  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      userId: room.createdByUserId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      metadata: true,
      currentPeriodEnd: true,
    },
  });

  const activeMeta = subscriptions
    .filter((subscription) =>
      isSubscriptionStillActive(subscription.currentPeriodEnd),
    )
    .map((subscription) => parseSubscriptionMahaMetadata(subscription.metadata))
    .find((meta) => meta?.planType === room.planType);

  if (!activeMeta) {
    return { tipsLimit, summaryLimit, progressSummaryEveryMoves };
  }

  if (activeMeta.tipsPerPlayer != null) {
    const parsed = Number(activeMeta.tipsPerPlayer);
    if (Number.isFinite(parsed) && parsed >= 0) tipsLimit = parsed;
  }

  if (activeMeta.summaryLimit != null) {
    const parsed = Number(activeMeta.summaryLimit);
    if (Number.isFinite(parsed) && parsed >= 0) summaryLimit = parsed;
  }

  if (activeMeta.progressSummaryEveryMoves != null) {
    const parsed = Number(activeMeta.progressSummaryEveryMoves);
    if (Number.isFinite(parsed) && parsed >= 0) {
      progressSummaryEveryMoves = parsed;
    }
  }

  return { tipsLimit, summaryLimit, progressSummaryEveryMoves };
}

async function generateFinalReportForParticipant(params: {
  room: {
    id: string;
    planType: string;
    orderId: string | null;
    createdByUserId: string;
  };
  participantId: string;
}) {
  const { room, participantId } = params;
  const { summaryLimit: finalLimit } = await getRoomAiLimits(room);

  const existingReports = await prisma.mahaLilahAiReport.count({
    where: {
      roomId: room.id,
      participantId,
      kind: "FINAL",
    },
  });

  if (existingReports >= finalLimit) {
    return { created: false as const };
  }

  const participant = await prisma.mahaLilahParticipant.findUnique({
    where: { id: participantId },
    select: { gameIntention: true },
  });
  if (!participant) {
    throw new Error("Participante não encontrado para gerar resumo final.");
  }

  const participantIntention = participant.gameIntention?.trim() || null;
  const context = await buildAiContext(room.id, participantId);
  const prompt = `Contexto do jogo (JSON):\n${JSON.stringify(context, null, 2)}\n\nIntenção da sessão: ${participantIntention || "não informada"}\n\nConsiderando a intenção do jogo e o caminho percorrido, faça o seguinte: (1) Gere um breve resumo das casas e movimentos percorridos. (2) Identifique os temas e padrões que surgiram em relação à intenção. (3) Ofereça um insight terapêutico central que resuma a experiência. (4) Sugira ações ou práticas terapêuticas alinhadas à intenção para os próximos sete dias. (5) Explique o que o caminho revelou sobre a intenção do jogador. (6) Deixe uma pergunta final para integrar o aprendizado no dia a dia.`;
  const content = await callOpenAI(prompt);

  await prisma.mahaLilahAiReport.create({
    data: {
      roomId: room.id,
      participantId,
      kind: "FINAL",
      content,
    },
  });

  return { created: true as const, content };
}

async function generateProgressSummaryIfNeeded(params: {
  roomId: string;
  participantId: string;
}) {
  const room = await prisma.mahaLilahRoom.findUnique({
    where: { id: params.roomId },
    select: {
      id: true,
      planType: true,
      orderId: true,
      isTrial: true,
      createdByUserId: true,
    },
  });

  if (!room) return { created: false as const };

  const { progressSummaryEveryMoves } = await getRoomAiLimits(room);
  const step = Number(progressSummaryEveryMoves || 0);
  if (!Number.isFinite(step) || step <= 0) {
    return { created: false as const };
  }

  const participant = await prisma.mahaLilahParticipant.findUnique({
    where: { id: params.participantId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!participant || participant.roomId !== room.id) {
    return { created: false as const };
  }

  const allMoves = await prisma.mahaLilahMove.findMany({
    where: { roomId: room.id, participantId: participant.id },
    orderBy: { createdAt: "asc" },
  });
  const postStartMoves = allMoves.filter(isPostStartMove);
  const postStartMoveCount = postStartMoves.length;

  if (postStartMoveCount === 0 || postStartMoveCount % step !== 0) {
    return { created: false as const };
  }

  const windowEndMoveIndex = postStartMoveCount;
  const windowStartMoveIndex =
    windowEndMoveIndex === step
      ? 1
      : Math.max(1, windowEndMoveIndex - step);

  const existingReport = await prisma.mahaLilahAiReport.findFirst({
    where: {
      roomId: room.id,
      participantId: participant.id,
      kind: "PROGRESS",
      windowEndMoveIndex,
    },
    select: { id: true },
  });

  if (existingReport) {
    return { created: false as const };
  }

  const postStartMoveIndexByMoveId = new Map(
    postStartMoves.map((move, index) => [move.id, index + 1]),
  );
  const windowMoves = postStartMoves.filter((move) => {
    const index = postStartMoveIndexByMoveId.get(move.id) || 0;
    return index >= windowStartMoveIndex && index <= windowEndMoveIndex;
  });
  if (windowMoves.length === 0) {
    return { created: false as const };
  }

  const windowMoveIds = windowMoves.map((move) => move.id);

  const [windowTherapyEntries, windowCardDraws, globalContext] =
    await Promise.all([
      prisma.mahaLilahTherapyEntry.findMany({
        where: {
          roomId: room.id,
          participantId: participant.id,
          moveId: { in: windowMoveIds },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.mahaLilahCardDraw.findMany({
        where: {
          roomId: room.id,
          drawnByParticipantId: participant.id,
          moveId: { in: windowMoveIds },
        },
        orderBy: { createdAt: "asc" },
        include: {
          card: {
            select: {
              cardNumber: true,
              keywords: true,
              description: true,
            },
          },
        },
      }),
      buildAiContext(room.id, participant.id),
    ]);

  const pathWithJumps: number[] = [];
  windowMoves.forEach((move) => {
    if (move.appliedJumpFrom === null || move.appliedJumpTo === null) {
      pathWithJumps.push(move.toPos);
      return;
    }
    pathWithJumps.push(move.appliedJumpFrom);
    pathWithJumps.push(move.appliedJumpTo);
  });

  const houseFrequency: Record<string, number> = {};
  pathWithJumps.forEach((house) => {
    houseFrequency[String(house)] = (houseFrequency[String(house)] || 0) + 1;
  });

  const participantIntention = participant.gameIntention?.trim() || null;
  const intervalContext = {
    participant: {
      id: participant.user.id,
      name: participant.user.name || participant.user.email,
    },
    intention: participantIntention,
    summaryEveryMoves: step,
    interval: {
      startMoveIndex: windowStartMoveIndex,
      endMoveIndex: windowEndMoveIndex,
    },
    moves: windowMoves.map((move) => {
      const postStartIndex = postStartMoveIndexByMoveId.get(move.id) || null;
      const fromHouse = getHouseByNumber(move.fromPos);
      const toHouse = getHouseByNumber(move.toPos);
      return {
        postStartMoveIndex: postStartIndex,
        turnNumber: move.turnNumber,
        diceValue: move.diceValue,
        fromPos: move.fromPos,
        fromHouseTitle: fromHouse?.title || null,
        toPos: move.toPos,
        toHouseTitle: toHouse?.title || null,
        appliedJumpFrom: move.appliedJumpFrom,
        appliedJumpTo: move.appliedJumpTo,
        createdAt: move.createdAt,
      };
    }),
    pathWithJumps,
    recurrentHouses: Object.entries(houseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([house, count]) => ({
        house: Number(house),
        title: getHouseByNumber(Number(house))?.title || null,
        count,
      })),
    therapyEntries: windowTherapyEntries.map((entry) => ({
      emotion: entry.emotion,
      intensity: entry.intensity,
      insight: entry.insight,
      body: entry.body,
      microAction: entry.microAction,
      createdAt: entry.createdAt,
    })),
    cards: windowCardDraws.map((draw) => ({
      cards: draw.cards,
      cardNumber: draw.card?.cardNumber ?? null,
      keywords: draw.card?.keywords ?? null,
      description: draw.card?.description ?? null,
      createdAt: draw.createdAt,
    })),
  };

  const prompt = `Contexto global da sessão (JSON):\n${JSON.stringify(globalContext, null, 2)}\n\nIntenção da sessão: ${participantIntention || "não informada"}\n\nCom base nesse caminho (JSON):\n${JSON.stringify(intervalContext, null, 2)}\n\ngere uma síntese em português que inclua: (1) um resumo do que aconteceu; (2) padrões simbólicos ou viradas significativas; (3) uma conexão direta com a intenção original do jogo; (4) três perguntas de reflexão que estimulem o autoconhecimento; (5) um insight final para encerrar este ciclo; (6) uma reflexão interna sobre o significado do caminho percorrido. Seja terapêutico, reflexivo e conecte a jornada à consciência.`;
  const content = await callOpenAI(prompt);

  await prisma.mahaLilahAiReport.create({
    data: {
      roomId: room.id,
      participantId: participant.id,
      kind: "PROGRESS",
      windowStartMoveIndex,
      windowEndMoveIndex,
      content: JSON.stringify({
        text: content,
        intention: participantIntention,
        intervalStart: windowStartMoveIndex,
        intervalEnd: windowEndMoveIndex,
        summaryEveryMoves: step,
      }),
    },
  });

  return {
    created: true as const,
    content,
    windowStartMoveIndex,
    windowEndMoveIndex,
  };
}

function ensureConsentAccepted(participant: {
  consentAcceptedAt: Date | null;
}) {
  if (!participant.consentAcceptedAt) {
    throw new Error("É necessário aceitar o termo de consentimento");
  }
}

function ensureNotViewerInTherapistSoloMode(
  room: { therapistSoloPlay: boolean },
  participant: { role: string },
) {
  if (room.therapistSoloPlay && participant.role !== "THERAPIST") {
    throw new Error(
      "Esta sala está no modo visualizador. Somente o terapeuta pode executar essa ação.",
    );
  }
}

function getTurnParticipants<
  T extends { id: string; role: string; userId: string },
>(
  participants: T[],
  therapistPlays: boolean,
  therapistSoloPlay = false,
) {
  if (therapistSoloPlay) {
    return participants.filter((participant) => participant.role === "THERAPIST");
  }
  return participants.filter(
    (participant) => therapistPlays || participant.role !== "THERAPIST",
  );
}

async function ensurePlayerStates(roomId: string, participantIds: string[]) {
  const existing = await prisma.mahaLilahPlayerState.findMany({
    where: { roomId, participantId: { in: participantIds } },
  });
  const existingIds = new Set(existing.map((state) => state.participantId));
  const missing = participantIds.filter((id) => !existingIds.has(id));
  if (missing.length === 0) return;

  await prisma.$transaction(
    missing.map((participantId) =>
      prisma.mahaLilahPlayerState.create({
        data: {
          roomId,
          participantId,
          position: START_INDEX,
          hasStarted: false,
          hasCompleted: false,
          rollCountTotal: 0,
          rollCountUntilStart: 0,
        },
      }),
    ),
  );
}

async function buildRoomState(roomId: string) {
  const room = await prisma.mahaLilahRoom.findUnique({
    where: { id: roomId },
    include: {
      order: { select: { metadata: true } },
      gameState: true,
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      playerStates: true,
      aiUsages: true,
      _count: {
        select: { aiReports: true },
      },
      moves: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          participant: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      cardDraws: {
        orderBy: { createdAt: "desc" },
        include: {
          move: {
            select: {
              turnNumber: true,
            },
          },
          card: {
            include: {
              deck: true,
            },
          },
          drawnBy: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!room) return null;

  const turnParticipants = getTurnParticipants(
    room.participants,
    room.therapistPlays,
    room.therapistSoloPlay,
  );
  const turnParticipantIds = turnParticipants.map(
    (participant) => participant.id,
  );
  await ensurePlayerStates(room.id, turnParticipantIds);

  const { tipsLimit } = await getRoomAiLimits(room);
  const aiUsageByParticipant = new Map(
    room.aiUsages.map((usage) => [usage.participantId, usage]),
  );

  const playerStates = await prisma.mahaLilahPlayerState.findMany({
    where: { roomId: room.id, participantId: { in: turnParticipantIds } },
  });

  let roomStatus = room.status;
  if (
    room.status === "ACTIVE" &&
    isTrialRoom(room) &&
    playerStates.some(
      (state) =>
        state.hasStarted &&
        state.rollCountTotal - state.rollCountUntilStart >=
          TRIAL_POST_START_MOVE_LIMIT,
    )
  ) {
    await prisma.mahaLilahRoom.update({
      where: { id: room.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    roomStatus = "CLOSED";
  }

  const currentTurnIndex = room.gameState?.currentTurnIndex ?? 0;
  const safeTurnIndex = turnParticipantIds.length
    ? currentTurnIndex % turnParticipantIds.length
    : 0;
  const turnParticipantId = turnParticipantIds.length
    ? turnParticipantIds[safeTurnIndex]
    : null;
  const therapistOnline = hasTherapistOnline(room.id, room.participants);

  return {
    room: {
      id: room.id,
      code: room.code,
      status: roomStatus,
      planType: room.planType,
      isTrial: isTrialRoom(room),
      playerIntentionLocked: room.playerIntentionLocked,
      therapistSoloPlay: room.therapistSoloPlay,
      therapistSummary: room.therapistSummary,
      aiReportsCount: room._count.aiReports,
      currentTurnIndex: safeTurnIndex,
      turnParticipantId,
      therapistOnline,
    },
    participants: room.participants.map((p) => ({
      id: p.id,
      role: p.role,
      user: p.user,
      consentAcceptedAt: p.consentAcceptedAt,
      gameIntention: p.gameIntention,
    })),
    playerStates: playerStates.map((state) => ({
      participantId: state.participantId,
      position: state.position,
      hasStarted: state.hasStarted,
      hasCompleted: state.hasCompleted,
      rollCountTotal: state.rollCountTotal,
      rollCountUntilStart: state.rollCountUntilStart,
    })),
    aiUsage: room.participants.map((participant) => {
      const usage = aiUsageByParticipant.get(participant.id);
      return {
        participantId: participant.id,
        tipsUsed: usage?.tipsUsed ?? 0,
        tipsLimit: usage?.tipsLimit ?? tipsLimit,
      };
    }),
    lastMove: room.moves[0] || null,
    deckHistory: room.cardDraws
      .slice()
      .reverse()
      .map((draw) => ({
        id: draw.id,
        moveId: draw.moveId,
        moveTurnNumber: draw.move?.turnNumber ?? null,
        cards: draw.cards,
        createdAt: draw.createdAt,
        drawnBy: draw.drawnBy,
        card: draw.card
          ? {
              id: draw.card.id,
              cardNumber: draw.card.cardNumber,
              description: draw.card.description,
              keywords: draw.card.keywords,
              observation: draw.card.observation,
              imageUrl: buildCardImageUrl(
                draw.card.deck.id,
                draw.card.deck.imageExtension,
                draw.card.cardNumber,
              ),
              deck: {
                id: draw.card.deck.id,
                name: draw.card.deck.name,
                imageDirectory: draw.card.deck.imageDirectory,
                imageExtension: draw.card.deck.imageExtension,
              },
            }
          : null,
      })),
  };
}

async function updateTurn(
  participantIds: string[],
  playerStates: Map<string, { hasCompleted: boolean }>,
  currentIndex: number,
) {
  if (participantIds.length === 0) return currentIndex;
  let nextIndex = currentIndex;
  for (let step = 0; step < participantIds.length; step += 1) {
    nextIndex = (nextIndex + 1) % participantIds.length;
    const participantId = participantIds[nextIndex];
    if (!playerStates.get(participantId)?.hasCompleted) {
      return nextIndex;
    }
  }
  return currentIndex;
}

async function rollInRoom(roomId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.mahaLilahRoom.findUnique({
      where: { id: roomId },
      include: {
        gameState: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        playerStates: true,
      },
    });

    if (!room) {
      throw new Error("Sala não encontrada");
    }
    if (room.status !== "ACTIVE") {
      throw new Error("Sala não está ativa");
    }
    if (!hasTherapistOnline(room.id, room.participants)) {
      throw new Error("A rolagem está pausada até o terapeuta estar na sala");
    }

    const turnParticipants = getTurnParticipants(
      room.participants,
      room.therapistPlays,
      room.therapistSoloPlay,
    );
    const turnParticipantIds = turnParticipants.map(
      (participant) => participant.id,
    );
    if (turnParticipantIds.length === 0) {
      throw new Error(
        "Aguardando participantes jogadores para iniciar a sessão",
      );
    }
    await ensurePlayerStates(room.id, turnParticipantIds);

    const playerStates = await tx.mahaLilahPlayerState.findMany({
      where: { roomId: room.id, participantId: { in: turnParticipantIds } },
    });

    const participantIndex = room.gameState?.currentTurnIndex ?? 0;
    const safeTurnIndex = participantIndex % turnParticipantIds.length;
    const currentParticipant = turnParticipants[safeTurnIndex];
    if (!currentParticipant || currentParticipant.userId !== userId) {
      throw new Error("Não é sua vez");
    }

    const currentState = playerStates.find(
      (state) => state.participantId === currentParticipant.id,
    );
    if (!currentState) {
      throw new Error("Estado do jogador não encontrado");
    }

    const trialRoom = isTrialRoom(room);

    if (trialRoom && currentState.hasStarted) {
      const postStartMovesUsed =
        currentState.rollCountTotal - currentState.rollCountUntilStart;
      if (postStartMovesUsed >= TRIAL_POST_START_MOVE_LIMIT) {
        await tx.mahaLilahRoom.update({
          where: { id: room.id },
          data: { status: "CLOSED", closedAt: new Date() },
        });
        const error = new Error(
          "Limite de 5 jogadas da sala trial atingido. Escolha um plano ou sessão avulsa para continuar.",
        ) as Error & { code?: string };
        error.code = "TRIAL_LIMIT_REACHED";
        throw error;
      }
    }

    const dice = randomDice();
    const move = applyMove({
      positionIndex: currentState.position,
      dice,
      hasStarted: currentState.hasStarted,
    });

    const updatedHasCompleted = isCompleted(move.toIndex, move.hasStartedAfter);

    await tx.mahaLilahPlayerState.update({
      where: { id: currentState.id },
      data: {
        position: move.toIndex,
        hasStarted: move.hasStartedAfter,
        hasCompleted: updatedHasCompleted,
        rollCountTotal: { increment: 1 },
        rollCountUntilStart: move.hasStartedBefore
          ? undefined
          : { increment: 1 },
      },
    });

    const moveCount = await tx.mahaLilahMove.count({
      where: { roomId: room.id },
    });

    await tx.mahaLilahMove.create({
      data: {
        roomId: room.id,
        turnNumber: moveCount + 1,
        participantId: currentParticipant.id,
        diceValue: dice,
        fromPos: move.fromHouse,
        toPos: move.toHouse,
        appliedJumpFrom: move.appliedJump?.from ?? null,
        appliedJumpTo: move.appliedJump?.to ?? null,
      },
    });

    const refreshedStates = await tx.mahaLilahPlayerState.findMany({
      where: { roomId: room.id, participantId: { in: turnParticipantIds } },
    });
    const stateMap = new Map(
      refreshedStates.map((state) => [state.participantId, state]),
    );

    const refreshedCurrentState = stateMap.get(currentParticipant.id);
    const postStartMovesUsedAfterMove =
      refreshedCurrentState && refreshedCurrentState.hasStarted
        ? refreshedCurrentState.rollCountTotal -
          refreshedCurrentState.rollCountUntilStart
        : 0;

    if (
      trialRoom &&
      refreshedCurrentState?.hasStarted &&
      postStartMovesUsedAfterMove >= TRIAL_POST_START_MOVE_LIMIT
    ) {
      await tx.mahaLilahRoom.update({
        where: { id: room.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      return {
        roomId: room.id,
        trialClosedByLimit: true,
        diceValue: dice,
        movedParticipantId: currentParticipant.id,
      };
    }

    const allCompleted =
      turnParticipantIds.length > 0 &&
      refreshedStates.length > 0 &&
      refreshedStates.every((state) => state.hasCompleted);

    const nextTurnIndex = allCompleted
      ? safeTurnIndex
      : await updateTurn(turnParticipantIds, stateMap, safeTurnIndex);

    await tx.mahaLilahGameState.upsert({
      where: { roomId: room.id },
      update: { currentTurnIndex: nextTurnIndex },
      create: { roomId: room.id, currentTurnIndex: nextTurnIndex },
    });

    if (allCompleted) {
      await tx.mahaLilahRoom.update({
        where: { id: room.id },
        data: { status: "COMPLETED", closedAt: new Date() },
      });
    }

    return {
      roomId: room.id,
      trialClosedByLimit: false,
      diceValue: dice,
      movedParticipantId: currentParticipant.id,
    };
  });
}

async function advanceTurnInRoom(roomId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.mahaLilahRoom.findUnique({
      where: { id: roomId },
      include: {
        gameState: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        playerStates: true,
      },
    });

    if (!room) throw new Error("Sala não encontrada");
    if (room.status !== "ACTIVE") throw new Error("Sala não está ativa");

    const currentParticipant = room.participants.find(
      (p) => p.userId === userId,
    );
    if (!currentParticipant || currentParticipant.role !== "THERAPIST") {
      throw new Error("Apenas o terapeuta pode avançar a vez");
    }

    const turnParticipants = getTurnParticipants(
      room.participants,
      room.therapistPlays,
      room.therapistSoloPlay,
    );
    const turnParticipantIds = turnParticipants.map(
      (participant) => participant.id,
    );
    if (turnParticipantIds.length === 0) {
      throw new Error(
        "Aguardando participantes jogadores para iniciar a sessão",
      );
    }
    await ensurePlayerStates(room.id, turnParticipantIds);

    const playerStates = await tx.mahaLilahPlayerState.findMany({
      where: { roomId: room.id, participantId: { in: turnParticipantIds } },
    });
    const stateMap = new Map(
      playerStates.map((state) => [state.participantId, state]),
    );

    const currentIndex =
      (room.gameState?.currentTurnIndex ?? 0) % turnParticipantIds.length;
    const nextTurnIndex = await updateTurn(
      turnParticipantIds,
      stateMap,
      currentIndex,
    );

    await tx.mahaLilahGameState.upsert({
      where: { roomId: room.id },
      update: { currentTurnIndex: nextTurnIndex },
      create: { roomId: room.id, currentTurnIndex: nextTurnIndex },
    });

    return { roomId: room.id };
  });
}

async function closeRoom(roomId: string, userId: string) {
  const room = await prisma.mahaLilahRoom.findUnique({
    where: { id: roomId },
    include: { participants: true },
  });
  if (!room) throw new Error("Sala não encontrada");

  const participant = room.participants.find((p) => p.userId === userId);
  if (!participant || participant.role !== "THERAPIST") {
    throw new Error("Apenas o terapeuta pode encerrar a sala");
  }

  await prisma.mahaLilahRoom.update({
    where: { id: room.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Token ausente"));
    }

    const decoded = jwt.verify(token, SOCKET_SECRET) as {
      sub: string;
      email: string;
      name?: string;
      role?: string;
    };
    socket.data.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    return next();
  } catch (error) {
    return next(new Error("Token inválido"));
  }
});

io.on("connection", (socket: AuthedSocket) => {
  const sessionHeartbeat = setInterval(() => {
    const userId = socket.data.user?.id;
    const roomId = socket.data.roomId;
    if (!userId || !roomId) return;
    void refreshUserActiveSession(userId, socket.id, roomId).catch((error) => {
      console.error(
        "[mahalilah-realtime][redis] falha ao renovar sessão ativa:",
        error,
      );
    });
  }, USER_SESSION_HEARTBEAT_MS);

  socket.on(
    "room:join",
    async ({ code }: { code: string }, callback?: (payload: any) => void) => {
      try {
        const currentUser = socket.data.user;
        if (!currentUser) throw new Error("Usuário não autenticado");
        const userId = currentUser.id;
        const previousRoomId = socket.data.roomId || null;
        const room = await prisma.mahaLilahRoom.findUnique({ where: { code } });
        if (!room) throw new Error("Sala não encontrada");

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: room.id, userId },
        });
        if (!participant) throw new Error("Sem acesso à sala");

        const claimed = await claimUserActiveSession(userId, room.id, socket.id);
        if (!claimed.ok) {
          const sameRoom = claimed.existingRoomId === room.id;
          throw buildSocketError(
            sameRoom
              ? "Você já está conectado nesta sala em outra aba/dispositivo."
              : "Você já está conectado em outra sala. Feche a sessão ativa antes de entrar em uma nova sala.",
            "CONCURRENT_ROOM_SESSION",
          );
        }

        try {
          if (previousRoomId) {
            removeRoomConnection(previousRoomId, userId);
            if (previousRoomId !== room.id) {
              socket.leave(previousRoomId);
              const previousState = await buildRoomState(previousRoomId);
              if (previousState)
                io.to(previousRoomId).emit("room:state", previousState);
            }
          }

          socket.join(room.id);
          socket.data.roomId = room.id;
          addRoomConnection(room.id, userId);

          const state = await buildRoomState(room.id);
          if (!state) throw new Error("Sala não encontrada");
          callback?.({ ok: true, state });
          io.to(room.id).emit("room:state", state);
        } catch (joinError) {
          try {
            if (previousRoomId) {
              await claimUserActiveSession(userId, previousRoomId, socket.id);
            } else {
              await releaseUserActiveSession(userId, socket.id);
            }
          } catch (restoreError) {
            console.error(
              "[mahalilah-realtime][redis] falha ao restaurar sessão após erro de join:",
              restoreError,
            );
          }
          throw joinError;
        }
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error?.message || "Não foi possível entrar na sala.",
          code: error?.code || null,
        });
      }
    },
  );

  socket.on(
    "game:roll",
    async (_payload: any, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        const roomId = socket.data.roomId;
        enforceCooldown(
          `roll:${socket.data.user.id}:${roomId}`,
          ROLL_COOLDOWN_MS,
        );

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);

        const result = await rollInRoom(roomId, socket.data.user.id);
        const state = await buildRoomState(roomId);
        if (state) io.to(roomId).emit("room:state", state);

        if (result?.movedParticipantId) {
          void (async () => {
            try {
              const generated = await generateProgressSummaryIfNeeded({
                roomId,
                participantId: result.movedParticipantId,
              });
              if (!generated.created) return;
              const refreshedState = await buildRoomState(roomId);
              if (refreshedState) {
                io.to(roomId).emit("room:state", refreshedState);
              }
            } catch (progressError) {
              console.error(
                "Erro ao gerar síntese 'O Caminho até agora':",
                progressError,
              );
            }
          })();
        }
        callback?.({
          ok: true,
          trialClosedByLimit: Boolean(result?.trialClosedByLimit),
          diceValue:
            typeof result?.diceValue === "number" ? result.diceValue : null,
        });
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error.message,
          code: error?.code || null,
        });
      }
    },
  );

  socket.on(
    "deck:draw",
    async (
      { moveId }: { moveId?: string },
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `deck:${socket.data.user.id}:${socket.data.roomId}`,
          DECK_COOLDOWN_MS,
        );
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");
        if (room.status !== "ACTIVE") throw new Error("Sala não está ativa");

        const participant = room.participants.find(
          (p) => p.userId === socket.data.user?.id,
        );
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
        ensureNotViewerInTherapistSoloMode(room, participant);

        if (!moveId) {
          throw new Error("Faça uma jogada antes de tirar carta");
        }

        const move = await prisma.mahaLilahMove.findUnique({
          where: { id: moveId },
        });
        if (!move || move.roomId !== room.id)
          throw new Error("Jogada inválida");
        if (move.participantId !== participant.id) {
          throw new Error("Jogada não pertence ao participante");
        }

        const existingDraws = await prisma.mahaLilahCardDraw.findMany({
          where: {
            roomId: room.id,
            moveId: move.id,
            drawnByParticipantId: participant.id,
          },
          select: {
            cards: true,
            cardId: true,
          },
        });

        const alreadyDrawnInMove = existingDraws.reduce((sum, draw) => {
          if (draw.cards.length > 0) return sum + draw.cards.length;
          if (draw.cardId) return sum + 1;
          return sum;
        }, 0);

        if (alreadyDrawnInMove >= 3) {
          throw new Error("Limite de 3 cartas por jogada atingido");
        }

        const availableCards = await prisma.cardDeckCard.findMany({
          where: {
            deck: {
              useInMahaLilah: true,
            },
          },
          include: {
            deck: true,
          },
        });

        if (availableCards.length === 0) {
          throw new Error(
            "Nenhuma carta disponível para Maha Lilah. Cadastre um baralho no admin.",
          );
        }

        const selectedCard =
          availableCards[Math.floor(Math.random() * availableCards.length)];

        await prisma.mahaLilahCardDraw.create({
          data: {
            roomId: room.id,
            moveId: move.id,
            drawnByParticipantId: participant.id,
            cards: [selectedCard.cardNumber],
            deckId: selectedCard.deckId,
            cardId: selectedCard.id,
          },
        });

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({
          ok: true,
          card: {
            id: selectedCard.id,
            cardNumber: selectedCard.cardNumber,
            description: selectedCard.description,
            keywords: selectedCard.keywords,
            observation: selectedCard.observation,
            imageUrl: buildCardImageUrl(
              selectedCard.deck.id,
              selectedCard.deck.imageExtension,
              selectedCard.cardNumber,
            ),
            deck: {
              id: selectedCard.deck.id,
              name: selectedCard.deck.name,
              imageDirectory: selectedCard.deck.imageDirectory,
              imageExtension: selectedCard.deck.imageExtension,
            },
          },
          drawCountInMove: alreadyDrawnInMove + 1,
          drawLimitInMove: 3,
        });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "therapy:save",
    async (
      { moveId, emotion, intensity, insight, body, microAction }: any,
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `therapy:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: socket.data.roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          select: { therapistSoloPlay: true },
        });
        if (!room) throw new Error("Sala não encontrada");
        ensureNotViewerInTherapistSoloMode(room, participant);

        if (!moveId) throw new Error("Move obrigatório");

        const move = await prisma.mahaLilahMove.findUnique({
          where: { id: moveId },
        });
        if (!move || move.roomId !== socket.data.roomId)
          throw new Error("Jogada inválida");
        if (move.participantId !== participant.id) {
          throw new Error("Registro permitido apenas para a própria jogada");
        }

        await prisma.mahaLilahTherapyEntry.create({
          data: {
            roomId: socket.data.roomId,
            moveId,
            participantId: participant.id,
            emotion: emotion || null,
            intensity: typeof intensity === "number" ? intensity : null,
            insight: insight || null,
            body: body || null,
            microAction: microAction || null,
          },
        });

        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({ ok: true });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "participant:setIntention",
    async (
      { intention }: { intention?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `participant-intention:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: socket.data.roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          select: { playerIntentionLocked: true, therapistSoloPlay: true },
        });
        if (!room) throw new Error("Sala não encontrada");
        ensureNotViewerInTherapistSoloMode(room, participant);
        if (participant.role === "PLAYER" && room.playerIntentionLocked) {
          throw new Error(
            "A intenção foi definida pelo terapeuta e está bloqueada para os jogadores.",
          );
        }

        const normalizedIntention =
          typeof intention === "string"
            ? intention.trim().slice(0, PLAYER_INTENTION_MAX_LENGTH)
            : "";

        await prisma.mahaLilahParticipant.update({
          where: { id: participant.id },
          data: { gameIntention: normalizedIntention || null },
        });

        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({ ok: true, intention: normalizedIntention || null });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "participant:replicateIntentionToPlayers",
    async (
      { intention }: { intention?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `participant-replicate-intention:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const therapist = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!therapist || therapist.role !== "THERAPIST") {
          throw new Error(
            "Apenas o terapeuta pode replicar a intenção para os jogadores.",
          );
        }
        ensureConsentAccepted(therapist);

        const normalizedIntention =
          typeof intention === "string"
            ? intention.trim().slice(0, PLAYER_INTENTION_MAX_LENGTH)
            : (therapist.gameIntention?.trim() || "");

        if (!normalizedIntention) {
          throw new Error(
            "Defina a intenção da sessão do terapeuta antes de replicar.",
          );
        }

        const updatedPlayers = await prisma.$transaction(async (tx) => {
          await tx.mahaLilahParticipant.update({
            where: { id: therapist.id },
            data: { gameIntention: normalizedIntention },
          });

          const result = await tx.mahaLilahParticipant.updateMany({
            where: {
              roomId: room.id,
              role: "PLAYER",
            },
            data: { gameIntention: normalizedIntention },
          });

          await tx.mahaLilahRoom.update({
            where: { id: room.id },
            data: { playerIntentionLocked: true },
          });

          return result.count;
        });

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({
          ok: true,
          intention: normalizedIntention,
          updatedPlayers,
        });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "ai:tip",
    async (
      _payload: { intention?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `ai:${socket.data.user.id}:${socket.data.roomId}`,
          AI_COOLDOWN_MS,
        );
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
        });
        if (!room) throw new Error("Sala não encontrada");
        if (room.status !== "ACTIVE") throw new Error("Sala não está ativa");

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: room.id, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
        ensureNotViewerInTherapistSoloMode(room, participant);

        const { tipsLimit } = await getRoomAiLimits(room);

        const usage = await prisma.mahaLilahAiUsage.upsert({
          where: {
            roomId_participantId: {
              roomId: room.id,
              participantId: participant.id,
            },
          },
          update: {},
          create: {
            roomId: room.id,
            participantId: participant.id,
            tipsUsed: 0,
            tipsLimit,
          },
        });

        if (usage.tipsUsed >= tipsLimit) {
          throw new Error("Limite de dicas atingido para esta sessão");
        }

        const participantIntention = participant.gameIntention?.trim() || null;
        const context = await buildAiContext(room.id, participant.id);
        const prompt = `Contexto do jogo (JSON):\n${JSON.stringify(context, null, 2)}\n\nIntenção da sessão: ${participantIntention || "não informada"}\n\nConsiderando a intenção original do jogo e o caminho percorrido até esta casa, gere: (1) uma hipótese terapêutica sobre o significado simbólico desta casa, conectando-a ao trajeto até aqui; (2) uma pergunta de insight que incentive a pessoa a refletir sobre o aprendizado deste ponto; (3) uma pergunta de insight conectando o caminho à experiência atual;(3) uma breve orientação para o próximo passo no jogo, que aprofunde a compreensão do caminho. (3) um insight final que aprofunde a compreensão do momento; (4) uma reflexão pessoal que convide o jogador a relacionar o aprendizado desta casa a uma situação ou sentimento da vida real. Seja reflexivo, terapêutico, integrador e focado em entendimento.`;

        const content = await callOpenAI(prompt);
        const lastMove = await prisma.mahaLilahMove.findFirst({
          where: { roomId: room.id, participantId: participant.id },
          orderBy: { createdAt: "desc" },
          select: { turnNumber: true, toPos: true },
        });
        const houseNumber =
          context.currentHouse &&
          typeof context.currentHouse.number === "number"
            ? context.currentHouse.number
            : (lastMove?.toPos ?? null);

        await prisma.mahaLilahAiReport.create({
          data: {
            roomId: room.id,
            participantId: participant.id,
            kind: "TIP",
            content: JSON.stringify({
              text: content,
              intention: participantIntention,
              turnNumber: lastMove?.turnNumber ?? null,
              houseNumber,
            }),
          },
        });

        const updatedUsage = await prisma.mahaLilahAiUsage.update({
          where: { id: usage.id },
          data: { tipsUsed: { increment: 1 }, tipsLimit },
        });

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({
          ok: true,
          content,
          tipsUsed: updatedUsage.tipsUsed,
          tipsLimit: updatedUsage.tipsLimit,
        });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "ai:finalReport",
    async (
      {
        participantId,
      }: { intention?: string; participantId?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `ai-final:${socket.data.user.id}:${socket.data.roomId}`,
          AI_COOLDOWN_MS,
        );
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const requester = room.participants.find(
          (roomParticipant) => roomParticipant.userId === socket.data.user?.id,
        );

        if (!requester) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requester);
        ensureNotViewerInTherapistSoloMode(room, requester);

        let targetParticipantId = requester.id;

        if (participantId && participantId !== requester.id) {
          if (room.therapistSoloPlay) {
            throw new Error(
              "No modo visualizador, o resumo final pode ser gerado apenas para o terapeuta.",
            );
          }
          if (requester.role !== "THERAPIST") {
            throw new Error(
              "Apenas o terapeuta pode gerar o resumo final para outro jogador.",
            );
          }

          const targetParticipant = room.participants.find(
            (roomParticipant) => roomParticipant.id === participantId,
          );
          if (!targetParticipant || targetParticipant.role === "THERAPIST") {
            throw new Error("Jogador não encontrado para gerar o resumo final.");
          }

          ensureConsentAccepted(targetParticipant);
          targetParticipantId = targetParticipant.id;
        }

        const generated = await generateFinalReportForParticipant({
          room,
          participantId: targetParticipantId,
        });

        if (!generated.created) {
          throw new Error("Resumo final já gerado para este jogador na sessão");
        }

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({
          ok: true,
          content: generated.content,
          participantId: targetParticipantId,
        });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "ai:finalReportAll",
    async (
      _payload: { intention?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `ai-final-all:${socket.data.user.id}:${socket.data.roomId}`,
          AI_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: {
            participants: true,
          },
        });
        if (!room) throw new Error("Sala não encontrada");

        const therapist = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!therapist || therapist.role !== "THERAPIST") {
          throw new Error(
            "Apenas o terapeuta pode gerar o resumo final para todos os jogadores.",
          );
        }
        ensureConsentAccepted(therapist);

        let participantIds = Array.from(
          new Set(
            room.participants
              .filter((participant) =>
                room.therapistSoloPlay
                  ? participant.role === "THERAPIST"
                  : participant.role !== "THERAPIST",
              )
              .map((participant) => participant.id),
          ),
        );

        // Trial com somente terapeuta (ou sala sem players elegiveis):
        // garante geracao do resumo final para o terapeuta.
        if (!participantIds.length) {
          participantIds = therapist ? [therapist.id] : [];
        }

        if (!participantIds.length) {
          throw new Error("Nenhum jogador elegível para resumo final.");
        }

        let generatedCount = 0;
        let skippedCount = 0;

        for (const participantId of participantIds) {
          const generated = await generateFinalReportForParticipant({
            room,
            participantId,
          });
          if (generated.created) {
            generatedCount += 1;
          } else {
            skippedCount += 1;
          }
        }

        if (generatedCount === 0) {
          throw new Error(
            "Resumo final já existe para todos os jogadores desta sala.",
          );
        }

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({ ok: true, generatedCount, skippedCount });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "game:nextTurn",
    async (_payload: any, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        await advanceTurnInRoom(socket.data.roomId, socket.data.user.id);
        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({ ok: true });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "room:close",
    async (_payload: any, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        await closeRoom(socket.data.roomId, socket.data.user.id);
        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({ ok: true });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on("disconnect", async () => {
    clearInterval(sessionHeartbeat);
    try {
      if (!socket.data.user?.id) return;
      const roomId = socket.data.roomId;
      const userId = socket.data.user.id;

      await releaseUserActiveSession(userId, socket.id);

      if (roomId) {
        removeRoomConnection(roomId, userId);
        const state = await buildRoomState(roomId);
        if (state) io.to(roomId).emit("room:state", state);
      }
    } catch {
      // no-op
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`MahaLilah realtime listening on :${PORT}`);
});
