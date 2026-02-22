import { createServer } from "http";
import { Server, Socket } from "socket.io";
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
import { MAHALILAH_INTERVENTION_SEED_DATA } from "../../../packages/database/prisma/seed.mahalilah-interventions";

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
const ADMIN_OPEN_TOKEN_KEY_PREFIX = "mahalilah:admin-open-token";

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
const TRIAL_INTERVENTIONS_LIMIT = Number(
  process.env.MAHALILAH_TRIAL_INTERVENTIONS_LIMIT || 8,
);
const TRIAL_PROGRESS_SUMMARY_EVERY_MOVES = Number(
  process.env.MAHALILAH_TRIAL_PROGRESS_SUMMARY_EVERY_MOVES || 15,
);
const INTERVENTION_CACHE_TTL_MS = Number(
  process.env.MAHALILAH_INTERVENTION_CACHE_TTL_MS || 30_000,
);
const INTERVENTION_TITLE_MAX_LENGTH = Number(
  process.env.MAHALILAH_INTERVENTION_TITLE_MAX_LENGTH || 140,
);
const INTERVENTION_MESSAGE_MAX_LENGTH = Number(
  process.env.MAHALILAH_INTERVENTION_MESSAGE_MAX_LENGTH || 1100,
);
const INTERVENTION_REFLECTION_MAX_LENGTH = Number(
  process.env.MAHALILAH_INTERVENTION_REFLECTION_MAX_LENGTH || 320,
);
const INTERVENTION_MICRO_ACTION_MAX_LENGTH = Number(
  process.env.MAHALILAH_INTERVENTION_MICRO_ACTION_MAX_LENGTH || 320,
);
const INTERVENTION_GLOBAL_COOLDOWN_MOVES = Number(
  process.env.MAHALILAH_INTERVENTION_GLOBAL_COOLDOWN_MOVES || 2,
);
const INTERVENTION_MIN_TRIGGER_COOLDOWN_MOVES = Number(
  process.env.MAHALILAH_INTERVENTION_MIN_TRIGGER_COOLDOWN_MOVES || 5,
);
const INTERVENTION_TEMPORAL_SCAN_MS = Number(
  process.env.MAHALILAH_INTERVENTION_TEMPORAL_SCAN_MS || 10_000,
);
const INTERVENTION_SNOOZE_MINUTES = Number(
  process.env.MAHALILAH_INTERVENTION_SNOOZE_MINUTES || 10,
);
const INTERVENTION_SCOPE_GLOBAL_ID = "__global__";
const INTERVENTION_MUTE_SESSION_NOTE = "MUTE_SESSION";
const MAX_INTERVENTION_LIMIT_PER_PARTICIPANT = 99;
const PLAYER_INTENTION_MAX_LENGTH = Number(
  process.env.MAHALILAH_PLAYER_INTENTION_MAX_LENGTH || 280,
);
const AI_TIP_QUESTION_MAX_LENGTH = Number(
  process.env.MAHALILAH_AI_TIP_QUESTION_MAX_LENGTH || 600,
);
const AI_OUT_OF_SCOPE_MESSAGE =
  "Posso ajudar apenas com questões do Maha Lilah e da sessão em andamento. Reformule sua pergunta com foco no jogo atual.";

type SocketUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
};

type SocketData = {
  user?: SocketUser;
  roomId?: string;
};

type PlanAiLimits = {
  tipsPerPlayer: number;
  summaryLimit: number;
  progressSummaryEveryMoves: number;
  interventionLimitPerParticipant: number;
};

type InterventionSeverity = "INFO" | "ATTENTION" | "CRITICAL";
type InterventionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "DISMISSED"
  | "SNOOZED";
type InterventionSource = "RULE" | "AI" | "HYBRID";
type InterventionVisibility = "THERAPIST_ONLY" | "ROOM";
type InterventionScopeType = "GLOBAL" | "PLAN" | "ROOM";
type InterventionAiPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
type InterventionFeedbackAction =
  | "HELPFUL"
  | "NOT_HELPFUL"
  | "APPLIED"
  | "DISMISSED";

type InterventionThresholds = {
  houseRepeatCount?: number;
  repeatedHouseWindowMoves?: number;
  snakeStreakCount?: number;
  preStartRollCount?: number;
  inactivityMinutes?: number;
  inactivitySeconds?: number;
  shadowStreakCount?: number;
  snakeWindowMoves?: number;
  noTherapyWindowMoves?: number;
  strongMoveMinDelta?: number;
  intensityMin?: number;
  intensityRepeatCount?: number;
  intensityWindowEntries?: number;
  fatigueMoveCount?: number;
  therapistSilenceMoves?: number;
  survivalDeepMaxHouse?: number;
  survivalBroadMaxHouse?: number;
  survivalWindowMoves?: number;
  survivalDeepCount?: number;
  survivalBroadCount?: number;
  survivalConsecutiveMaxHouse?: number;
  survivalConsecutiveCount?: number;
  survivalIgnoreInitialMoves?: number;
  survivalPersistenceWindowMoves?: number;
  survivalPersistenceMaxHouse?: number;
  survivalPersistenceCount?: number;
  rapidRollWindowMoves?: number;
  rapidRollMaxAvgSeconds?: number;
  fastAscentWindowMoves?: number;
  fastAscentMinCount?: number;
  fastAscentMinDelta?: number;
  checkpointEveryMoves?: number;
};

type InterventionPromptRecord = {
  id: string;
  locale: string;
  name: string;
  systemPrompt: string | null;
  userPromptTemplate: string;
  isActive: boolean;
};

type InterventionConfigRecord = {
  id: string;
  triggerId: string;
  title: string;
  description: string | null;
  enabled: boolean;
  useAi: boolean;
  aiPolicy: InterventionAiPolicy;
  sensitive: boolean;
  requireTherapistApproval: boolean;
  autoApproveWhenTherapistSolo: boolean;
  severity: InterventionSeverity;
  scopeType: InterventionScopeType;
  scopeId: string;
  version: number;
  cooldownMoves: number;
  cooldownMinutes: number;
  thresholds: InterventionThresholds;
  metadata: Record<string, unknown>;
  prompts: InterventionPromptRecord[];
};

type InterventionCandidate = {
  participantId: string;
  triggerId: string;
  triggerLabel: string;
  severity: InterventionSeverity;
  turnNumber: number | null;
  moveId: string | null;
  triggerData: Record<string, unknown>;
  fallbackTitle: string;
  fallbackMessage: string;
  fallbackReflectionQuestion?: string | null;
  fallbackMicroAction?: string | null;
  visibleTo?: InterventionVisibility;
};

type DefaultInterventionCatalogItem = {
  triggerId: string;
  title: string;
  description: string;
  enabled: boolean;
  useAi: boolean;
  aiPolicy: InterventionAiPolicy;
  sensitive: boolean;
  requireTherapistApproval: boolean;
  autoApproveWhenTherapistSolo: boolean;
  severity: InterventionSeverity;
  scopeType: InterventionScopeType;
  scopeId: string;
  version: number;
  cooldownMoves: number;
  cooldownMinutes: number;
  thresholds: InterventionThresholds;
  metadata?: Record<string, unknown>;
  prompts?: Array<{
    locale: string;
    name: string;
    systemPrompt?: string | null;
    userPromptTemplate: string;
  }>;
};

const DEFAULT_INTERVENTION_CATALOG: DefaultInterventionCatalogItem[] =
  MAHALILAH_INTERVENTION_SEED_DATA.map((item) => ({
    triggerId: item.triggerId,
    title: item.title,
    description: item.description,
    enabled: item.enabled,
    useAi: item.useAi,
    aiPolicy: item.aiPolicy as InterventionAiPolicy,
    sensitive: item.sensitive,
    requireTherapistApproval: item.requireTherapistApproval,
    autoApproveWhenTherapistSolo: item.autoApproveWhenTherapistSolo,
    severity: item.severity as InterventionSeverity,
    scopeType: item.scopeType as InterventionScopeType,
    scopeId: item.scopeId,
    version: item.version,
    cooldownMoves: item.cooldownMoves,
    cooldownMinutes: item.cooldownMinutes,
    thresholds: item.thresholds as InterventionThresholds,
    metadata: item.metadata,
    prompts: item.prompts?.map((prompt) => ({
      locale: prompt.locale,
      name: prompt.name,
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate,
    })),
  }));

function getMahaLilahOpenSecret() {
  return process.env.MAHALILAH_SOCKET_SECRET || process.env.NEXTAUTH_SECRET;
}

function hasValidLegacyAdminOpenToken(params: {
  token: string | null | undefined;
  roomId: string;
  roomCode: string;
}) {
  if (!params.token) return false;
  const secret = getMahaLilahOpenSecret();
  if (!secret) return false;

  try {
    const payload = jwt.verify(params.token, secret) as {
      scope?: string;
      roomId?: string;
      roomCode?: string;
    };

    return (
      payload.scope === "mahalilah_admin_room_open" &&
      payload.roomId === params.roomId &&
      payload.roomCode === params.roomCode
    );
  } catch {
    return false;
  }
}

function buildAdminOpenTokenKey(token: string) {
  return `${ADMIN_OPEN_TOKEN_KEY_PREFIX}:${token}`;
}

async function hasValidAdminOpenToken(params: {
  token: string | null | undefined;
  roomId: string;
  roomCode: string;
}) {
  if (!params.token) return false;
  if (params.token.length > 512) return false;

  try {
    await ensureRedisConnected();
    const rawGrant = await redis.get(buildAdminOpenTokenKey(params.token));
    if (rawGrant) {
      const grant = JSON.parse(rawGrant) as {
        scope?: string;
        roomId?: string;
        roomCode?: string;
      };
      if (
        grant.scope === "mahalilah_admin_room_open" &&
        grant.roomId === params.roomId &&
        grant.roomCode === params.roomCode
      ) {
        return true;
      }
    }
  } catch (error) {
    console.error(
      "[mahalilah-realtime] falha ao validar ticket adminOpenToken no Redis:",
      error,
    );
  }

  return hasValidLegacyAdminOpenToken(params);
}

const httpServer = createServer();
const io = new Server<any, any, any, SocketData>(httpServer, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
  },
});

type AuthedSocket = Socket<any, any, any, SocketData>;

const actionCooldowns = new Map<string, number>();
const roomUserConnections = new Map<string, Map<string, number>>();
const temporalScanRoomsInFlight = new Set<string>();
let planAiLimitsCache: {
  expiresAt: number;
  byPlanType: Map<string, PlanAiLimits>;
} = {
  expiresAt: 0,
  byPlanType: new Map(),
};
let interventionCatalogSeedPromise: Promise<void> | null = null;
let interventionConfigCache: {
  expiresAt: number;
  configs: InterventionConfigRecord[];
} = {
  expiresAt: 0,
  configs: [],
};

async function scanTemporalInterventionsForActiveRooms() {
  const activeRoomIds = Array.from(roomUserConnections.keys());
  if (activeRoomIds.length === 0) return;

  await Promise.all(
    activeRoomIds.map(async (roomId) => {
      if (temporalScanRoomsInFlight.has(roomId)) return;
      temporalScanRoomsInFlight.add(roomId);
      try {
        const generated = await evaluateTemporalInterventionsForRoom({ roomId });
        if (generated.length === 0) return;
        io.to(roomId).emit("intervention:generated", {
          roomId,
          participantId: null,
          interventions: generated.map((item) => ({
            id: item.id,
            participantId: item.participantId,
            status: item.status,
            triggerId: item.triggerId,
            title: item.title,
          })),
          pendingApprovals: generated.filter(
            (item) => item.status === "PENDING_APPROVAL",
          ).length,
        });
      } catch (error) {
        console.error(
          "[mahalilah-realtime] erro ao processar intervenções temporais:",
          error,
        );
      } finally {
        temporalScanRoomsInFlight.delete(roomId);
      }
    }),
  );
}

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

function hasParticipantOnline(roomId: string, userId: string) {
  const users = roomUserConnections.get(roomId);
  if (!users || users.size === 0) return false;
  return (users.get(userId) || 0) > 0;
}

function buildSocketError(message: string, code?: string) {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}

function buildUserActiveSessionKey(userId: string) {
  return `${USER_ACTIVE_SESSION_KEY_PREFIX}:${userId}`;
}

function asPlainObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNonNegativeInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function normalizeInterventionThresholds(raw: unknown): InterventionThresholds {
  const obj = asPlainObject(raw);
  return {
    houseRepeatCount: asNonNegativeInt(obj.houseRepeatCount, 0),
    repeatedHouseWindowMoves: asNonNegativeInt(obj.repeatedHouseWindowMoves, 0),
    snakeStreakCount: asNonNegativeInt(obj.snakeStreakCount, 0),
    preStartRollCount: asNonNegativeInt(obj.preStartRollCount, 0),
    inactivityMinutes: asNonNegativeInt(obj.inactivityMinutes, 0),
    inactivitySeconds: asNonNegativeInt(obj.inactivitySeconds, 0),
    shadowStreakCount: asNonNegativeInt(obj.shadowStreakCount, 0),
    snakeWindowMoves: asNonNegativeInt(obj.snakeWindowMoves, 0),
    noTherapyWindowMoves: asNonNegativeInt(obj.noTherapyWindowMoves, 0),
    strongMoveMinDelta: asNonNegativeInt(obj.strongMoveMinDelta, 0),
    intensityMin: asNonNegativeInt(obj.intensityMin, 0),
    intensityRepeatCount: asNonNegativeInt(obj.intensityRepeatCount, 0),
    intensityWindowEntries: asNonNegativeInt(obj.intensityWindowEntries, 0),
    fatigueMoveCount: asNonNegativeInt(obj.fatigueMoveCount, 0),
    therapistSilenceMoves: asNonNegativeInt(obj.therapistSilenceMoves, 0),
    survivalDeepMaxHouse: asNonNegativeInt(obj.survivalDeepMaxHouse, 0),
    survivalBroadMaxHouse: asNonNegativeInt(obj.survivalBroadMaxHouse, 0),
    survivalWindowMoves: asNonNegativeInt(obj.survivalWindowMoves, 0),
    survivalDeepCount: asNonNegativeInt(obj.survivalDeepCount, 0),
    survivalBroadCount: asNonNegativeInt(obj.survivalBroadCount, 0),
    survivalConsecutiveMaxHouse: asNonNegativeInt(
      obj.survivalConsecutiveMaxHouse,
      0,
    ),
    survivalConsecutiveCount: asNonNegativeInt(obj.survivalConsecutiveCount, 0),
    survivalIgnoreInitialMoves: asNonNegativeInt(obj.survivalIgnoreInitialMoves, 0),
    survivalPersistenceWindowMoves: asNonNegativeInt(
      obj.survivalPersistenceWindowMoves,
      0,
    ),
    survivalPersistenceMaxHouse: asNonNegativeInt(
      obj.survivalPersistenceMaxHouse,
      0,
    ),
    survivalPersistenceCount: asNonNegativeInt(obj.survivalPersistenceCount, 0),
    rapidRollWindowMoves: asNonNegativeInt(obj.rapidRollWindowMoves, 0),
    rapidRollMaxAvgSeconds: asNonNegativeInt(obj.rapidRollMaxAvgSeconds, 0),
    fastAscentWindowMoves: asNonNegativeInt(obj.fastAscentWindowMoves, 0),
    fastAscentMinCount: asNonNegativeInt(obj.fastAscentMinCount, 0),
    fastAscentMinDelta: asNonNegativeInt(obj.fastAscentMinDelta, 0),
    checkpointEveryMoves: asNonNegativeInt(obj.checkpointEveryMoves, 0),
  };
}

function trimToMax(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  return value.trim().slice(0, maxLength);
}

function pickBestInterventionPrompt(config: InterventionConfigRecord) {
  if (!config.prompts.length) return null;
  const exactPtBr = config.prompts.find(
    (prompt) => prompt.locale.toLowerCase() === "pt-br",
  );
  if (exactPtBr) return exactPtBr;
  const startsWithPt = config.prompts.find((prompt) =>
    prompt.locale.toLowerCase().startsWith("pt"),
  );
  return startsWithPt || config.prompts[0];
}

function renderPromptTemplate(
  template: string,
  replacements: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, rawKey) => {
    const key = String(rawKey);
    const value = replacements[key];
    if (value == null) return "";
    return String(value);
  });
}

function extractLikelyJsonObject(raw: string) {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  return raw.slice(first, last + 1);
}

function parseInterventionAiPayload(raw: string): {
  title: string;
  message: string;
  reflectionQuestion: string | null;
  microAction: string | null;
} {
  const trimmed = raw.trim();
  const maybeJson = extractLikelyJsonObject(trimmed);
  const tryParse = (candidate: string) => {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const parsed = maybeJson ? tryParse(maybeJson) : tryParse(trimmed);
  if (parsed && typeof parsed === "object") {
    const title = trimToMax(
      typeof parsed.title === "string" ? parsed.title : "Intervenção assistida",
      INTERVENTION_TITLE_MAX_LENGTH,
    );
    const message = trimToMax(
      typeof parsed.message === "string"
        ? parsed.message
        : typeof parsed.text === "string"
          ? parsed.text
          : trimmed,
      INTERVENTION_MESSAGE_MAX_LENGTH,
    );
    const reflectionQuestion = trimToMax(
      typeof parsed.reflectionQuestion === "string"
        ? parsed.reflectionQuestion
        : typeof parsed.question === "string"
          ? parsed.question
          : "",
      INTERVENTION_REFLECTION_MAX_LENGTH,
    );
    const microAction = trimToMax(
      typeof parsed.microAction === "string"
        ? parsed.microAction
        : typeof parsed.action === "string"
          ? parsed.action
          : "",
      INTERVENTION_MICRO_ACTION_MAX_LENGTH,
    );

    return {
      title: title || "Intervenção assistida",
      message: message || "Sem mensagem disponível.",
      reflectionQuestion: reflectionQuestion || null,
      microAction: microAction || null,
    };
  }

  return {
    title: "Intervenção assistida",
    message: trimToMax(trimmed || "Sem mensagem disponível.", INTERVENTION_MESSAGE_MAX_LENGTH),
    reflectionQuestion: null,
    microAction: null,
  };
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

type ForceClaimUserSessionResult = {
  replacedRoomId: string | null;
  replacedSocketId: string | null;
  replacedInstanceId: string | null;
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

async function forceClaimUserActiveSession(
  userId: string,
  roomId: string,
  socketId: string,
): Promise<ForceClaimUserSessionResult> {
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

      local existingSocketId = redis.call('HGET', key, 'socketId') or ''
      local existingRoomId = redis.call('HGET', key, 'roomId') or ''
      local existingInstanceId = redis.call('HGET', key, 'instanceId') or ''

      redis.call('HSET', key,
        'socketId', socketId,
        'roomId', roomId,
        'instanceId', instanceId,
        'updatedAt', updatedAt
      )
      redis.call('PEXPIRE', key, ttlMs)

      return {existingRoomId, existingSocketId, existingInstanceId}
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
  const replacedRoomIdRaw = normalized[0];
  const replacedSocketIdRaw = normalized[1];
  const replacedInstanceIdRaw = normalized[2];

  return {
    replacedRoomId: replacedRoomIdRaw ? String(replacedRoomIdRaw) : null,
    replacedSocketId: replacedSocketIdRaw
      ? String(replacedSocketIdRaw)
      : null,
    replacedInstanceId: replacedInstanceIdRaw
      ? String(replacedInstanceIdRaw)
      : null,
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

async function ensureInterventionCatalogSeeded() {
  if (interventionCatalogSeedPromise) {
    await interventionCatalogSeedPromise;
    return;
  }

  interventionCatalogSeedPromise = (async () => {
    for (const config of DEFAULT_INTERVENTION_CATALOG) {
      const persistedConfig = await prisma.mahaLilahInterventionConfig.upsert({
        where: {
          MahaLilahInterventionConfig_trigger_scope_key: {
            triggerId: config.triggerId,
            scopeType: config.scopeType,
            scopeId: config.scopeId,
          },
        },
        update: {
          title: config.title,
          description: config.description,
          enabled: config.enabled,
          useAi: config.useAi,
          aiPolicy: config.aiPolicy,
          sensitive: config.sensitive,
          requireTherapistApproval: config.requireTherapistApproval,
          autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
          severity: config.severity,
          version: config.version,
          cooldownMoves: config.cooldownMoves,
          cooldownMinutes: config.cooldownMinutes,
          thresholds: config.thresholds as any,
          metadata: (config.metadata || {}) as any,
        },
        create: {
          triggerId: config.triggerId,
          title: config.title,
          description: config.description,
          enabled: config.enabled,
          useAi: config.useAi,
          aiPolicy: config.aiPolicy,
          sensitive: config.sensitive,
          requireTherapistApproval: config.requireTherapistApproval,
          autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
          severity: config.severity,
          scopeType: config.scopeType,
          scopeId: config.scopeId,
          version: config.version,
          cooldownMoves: config.cooldownMoves,
          cooldownMinutes: config.cooldownMinutes,
          thresholds: config.thresholds as any,
          metadata: (config.metadata || {}) as any,
        },
      });

      if (!config.prompts?.length) continue;

      for (const prompt of config.prompts) {
        const existingPrompt = await prisma.mahaLilahInterventionPrompt.findFirst({
          where: {
            configId: persistedConfig.id,
            locale: prompt.locale,
            name: prompt.name,
          },
          select: { id: true },
        });
        if (existingPrompt) continue;

        await prisma.mahaLilahInterventionPrompt.create({
          data: {
            configId: persistedConfig.id,
            locale: prompt.locale,
            name: prompt.name,
            isActive: true,
            systemPrompt: prompt.systemPrompt || null,
            userPromptTemplate: prompt.userPromptTemplate,
          },
        });
      }
    }
  })()
    .catch((error) => {
      console.error(
        "[mahalilah-realtime] falha ao garantir catálogo padrão de intervenções:",
        error,
      );
      throw error;
    })
    .finally(() => {
      interventionCatalogSeedPromise = null;
    });

  await interventionCatalogSeedPromise;
}

function normalizeInterventionConfig(raw: any): InterventionConfigRecord {
  const aiPolicy: InterventionAiPolicy =
    raw.aiPolicy === "OPTIONAL" || raw.aiPolicy === "REQUIRED"
      ? raw.aiPolicy
      : "NONE";
  const scopeType: InterventionScopeType =
    raw.scopeType === "PLAN" || raw.scopeType === "ROOM"
      ? raw.scopeType
      : "GLOBAL";
  return {
    id: raw.id,
    triggerId: raw.triggerId,
    title: String(raw.title || raw.triggerId),
    description: raw.description ? String(raw.description) : null,
    enabled: Boolean(raw.enabled),
    useAi: Boolean(raw.useAi),
    aiPolicy,
    sensitive: Boolean(raw.sensitive),
    requireTherapistApproval: Boolean(raw.requireTherapistApproval),
    autoApproveWhenTherapistSolo: Boolean(raw.autoApproveWhenTherapistSolo),
    severity:
      raw.severity === "CRITICAL" || raw.severity === "ATTENTION"
        ? raw.severity
        : "INFO",
    scopeType,
    scopeId:
      typeof raw.scopeId === "string" && raw.scopeId.trim()
        ? raw.scopeId.trim()
        : INTERVENTION_SCOPE_GLOBAL_ID,
    version: asNonNegativeInt(raw.version, 1) || 1,
    cooldownMoves: asNonNegativeInt(raw.cooldownMoves, 0),
    cooldownMinutes: asNonNegativeInt(raw.cooldownMinutes, 0),
    thresholds: normalizeInterventionThresholds(raw.thresholds),
    metadata: asPlainObject(raw.metadata),
    prompts: Array.isArray(raw.prompts)
      ? raw.prompts.map((prompt: any) => ({
          id: prompt.id,
          locale: String(prompt.locale || "pt-BR"),
          name: String(prompt.name || "Prompt"),
          systemPrompt:
            typeof prompt.systemPrompt === "string"
              ? prompt.systemPrompt
              : null,
          userPromptTemplate: String(prompt.userPromptTemplate || ""),
          isActive: Boolean(prompt.isActive),
        }))
      : [],
  };
}

async function loadInterventionConfigCatalog(params?: { force?: boolean }) {
  const force = Boolean(params?.force);
  const now = Date.now();
  if (
    !force &&
    interventionConfigCache.configs.length > 0 &&
    interventionConfigCache.expiresAt > now
  ) {
    return interventionConfigCache.configs;
  }

  await ensureInterventionCatalogSeeded();

  const configs = await prisma.mahaLilahInterventionConfig.findMany({
    include: {
      prompts: {
        where: { isActive: true },
        orderBy: [{ locale: "asc" }, { updatedAt: "desc" }],
      },
    },
  });

  const normalizedConfigs = configs.map((config) =>
    normalizeInterventionConfig(config),
  );

  interventionConfigCache = {
    configs: normalizedConfigs,
    expiresAt: now + INTERVENTION_CACHE_TTL_MS,
  };
  return normalizedConfigs;
}

function resolveInterventionConfigsByTriggerId(params: {
  roomId: string;
  planType: string;
  configs: InterventionConfigRecord[];
}) {
  const byTrigger = new Map<string, InterventionConfigRecord>();
  const byScopePriority = (
    config: InterventionConfigRecord,
    triggerId: string,
  ) => {
    const current = byTrigger.get(triggerId);
    if (!current) return true;
    const priority = (scopeType: InterventionScopeType) => {
      if (scopeType === "ROOM") return 3;
      if (scopeType === "PLAN") return 2;
      return 1;
    };
    return priority(config.scopeType) >= priority(current.scopeType);
  };

  params.configs.forEach((config) => {
    const isGlobal =
      config.scopeType === "GLOBAL" &&
      config.scopeId === INTERVENTION_SCOPE_GLOBAL_ID;
    const isPlan =
      config.scopeType === "PLAN" && config.scopeId === params.planType;
    const isRoom =
      config.scopeType === "ROOM" && config.scopeId === params.roomId;
    if (!isGlobal && !isPlan && !isRoom) return;
    if (!byScopePriority(config, config.triggerId)) return;
    byTrigger.set(config.triggerId, config);
  });

  Array.from(byTrigger.entries()).forEach(([triggerId, config]) => {
    if (!config.enabled) {
      byTrigger.delete(triggerId);
    }
  });

  return byTrigger;
}

async function loadInterventionConfigsByTriggerIdForRoom(params: {
  roomId: string;
  planType: string;
  force?: boolean;
}) {
  const configs = await loadInterventionConfigCatalog({ force: params.force });
  return resolveInterventionConfigsByTriggerId({
    roomId: params.roomId,
    planType: params.planType,
    configs,
  });
}

const DEFAULT_OPENAI_SYSTEM_PROMPT =
  "Você é um assistente terapêutico especializado no jogo Maha Lilah. Responda em português, de modo claro e acolhedor. Você só pode responder conteúdos relacionados ao Maha Lilah e à sessão em andamento, usando apenas o contexto fornecido. Se a solicitação estiver fora do escopo da partida/sessão atual, recuse educadamente e responda exatamente com a mensagem de recusa definida no prompt do usuário. Nunca invente contexto que não esteja nos dados fornecidos.";

async function callOpenAIWithMessages(params: {
  userPrompt: string;
  systemPrompt?: string | null;
  temperature?: number;
}) {
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
      temperature:
        typeof params.temperature === "number" ? params.temperature : 0.4,
      messages: [
        {
          role: "system",
          content: params.systemPrompt || DEFAULT_OPENAI_SYSTEM_PROMPT,
        },
        { role: "user", content: params.userPrompt },
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

async function callOpenAI(prompt: string) {
  return callOpenAIWithMessages({
    userPrompt: prompt,
    systemPrompt: DEFAULT_OPENAI_SYSTEM_PROMPT,
  });
}

async function buildAiContext(roomId: string, participantId: string) {
  const participant = await prisma.mahaLilahParticipant.findUnique({
    where: { id: participantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!participant) throw new Error("Participante não encontrado");

  const [playerState, pathMoves, recentMoves, therapyEntries] = await Promise.all([
    prisma.mahaLilahPlayerState.findFirst({ where: { roomId, participantId } }),
    prisma.mahaLilahMove.findMany({
      where: { roomId, participantId },
      orderBy: { createdAt: "asc" },
      select: {
        diceValue: true,
        fromPos: true,
        toPos: true,
        appliedJumpFrom: true,
        appliedJumpTo: true,
      },
    }),
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

  const path = pathMoves.filter(isPostStartMove).map((move) => move.toPos);

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
    recentMoves: recentMoves.map((move) => ({
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

function buildAiTipPrompt({
  context,
  participantIntention,
  mode,
  question,
}: {
  context: Awaited<ReturnType<typeof buildAiContext>>;
  participantIntention: string | null;
  mode: "currentHouse" | "pathQuestion";
  question: string | null;
}) {
  const contextJson = JSON.stringify(context, null, 2);
  const intentionText = participantIntention || "não informada";

  if (mode === "pathQuestion") {
    return `Contexto do jogo (JSON):\n${contextJson}\n\nIntenção da sessão: ${intentionText}\nPergunta/contexto enviado pelo jogador: ${question || "não informado"}\n\nRegra obrigatória de escopo: se a pergunta/contexto não estiver relacionada ao Maha Lilah ou à sessão atual, responda exatamente com:\n"${AI_OUT_OF_SCOPE_MESSAGE}"\n\nSe a pergunta estiver no escopo, responda em português, de forma terapêutica e prática, trazendo:\n1) Leitura simbólica do caminho até agora (incluindo padrões/repetições relevantes);\n2) Resposta direta à pergunta/contexto da pessoa;\n3) Uma pergunta de auto-investigação para aprofundar o insight;\n4) Uma orientação breve para o próximo passo no jogo e na vida real\n\nSeja acolhedor, claro e específico ao contexto atual do jogador.`;
  }

  return `Contexto do jogo (JSON):\n${contextJson}\n\nIntenção da sessão: ${intentionText}\n\nRegra obrigatória de escopo: se faltar contexto para responder algo sobre o jogo atual, responda exatamente com:\n"${AI_OUT_OF_SCOPE_MESSAGE}"\n\nCom base na casa atual e no caminho percorrido até aqui, gere em português:\n1) Uma hipótese terapêutica sobre o significado simbólico da casa atual;\n2) Uma conexão objetiva desta casa com o trajeto percorrido até agora;\n3) Uma pergunta de insight para o jogador;\n4) Uma orientação breve para o próximo passo no jogo e na vida real.\n\nSeja reflexivo, acolhedor e focado em entendimento da casa atual.`;
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
      interventionLimitPerParticipant: true,
    },
  });

  const byPlanType = new Map<string, PlanAiLimits>();

  plans.forEach((plan) => {
    byPlanType.set(plan.planType, {
      tipsPerPlayer: Number(plan.tipsPerPlayer || 0),
      summaryLimit: Number(plan.summaryLimit || 0),
      progressSummaryEveryMoves: Number(plan.progressSummaryEveryMoves || 0),
      interventionLimitPerParticipant: Number(
        (plan as any).interventionLimitPerParticipant ?? 8,
      ),
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
    interventionLimitPerParticipant?: number;
    durationDays?: number;
  };
}

function isSubscriptionStillActive(currentPeriodEnd: Date | null) {
  if (!currentPeriodEnd) return true;
  return currentPeriodEnd.getTime() >= Date.now();
}

function clampInterventionLimit(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(MAX_INTERVENTION_LIMIT_PER_PARTICIPANT, Math.floor(value));
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
      interventionLimitPerParticipant: clampInterventionLimit(
        TRIAL_INTERVENTIONS_LIMIT,
      ),
    };
  }

  const defaults = await getDefaultAiLimitsForPlan(room.planType);
  let tipsLimit = defaults.tipsPerPlayer;
  let summaryLimit = defaults.summaryLimit;
  let progressSummaryEveryMoves = defaults.progressSummaryEveryMoves;
  let interventionLimitPerParticipant = clampInterventionLimit(
    defaults.interventionLimitPerParticipant,
  );

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
    if (meta?.interventionLimitPerParticipant != null) {
      const parsed = Number(meta.interventionLimitPerParticipant);
      if (Number.isFinite(parsed) && parsed >= 0) {
        interventionLimitPerParticipant = clampInterventionLimit(parsed);
      }
    }
    return {
      tipsLimit,
      summaryLimit,
      progressSummaryEveryMoves,
      interventionLimitPerParticipant,
    };
  }

  if (room.planType !== "SUBSCRIPTION" && room.planType !== "SUBSCRIPTION_LIMITED") {
    return {
      tipsLimit,
      summaryLimit,
      progressSummaryEveryMoves,
      interventionLimitPerParticipant,
    };
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
    return {
      tipsLimit,
      summaryLimit,
      progressSummaryEveryMoves,
      interventionLimitPerParticipant,
    };
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
  if (activeMeta.interventionLimitPerParticipant != null) {
    const parsed = Number(activeMeta.interventionLimitPerParticipant);
    if (Number.isFinite(parsed) && parsed >= 0) {
      interventionLimitPerParticipant = clampInterventionLimit(parsed);
    }
  }

  return {
    tipsLimit,
    summaryLimit,
    progressSummaryEveryMoves,
    interventionLimitPerParticipant: clampInterventionLimit(
      interventionLimitPerParticipant,
    ),
  };
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
  onStatusChange?: (payload: {
    status: "processing" | "done";
    participantId: string;
    participantName: string;
    windowStartMoveIndex: number;
    windowEndMoveIndex: number;
  }) => void;
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
  params.onStatusChange?.({
    status: "processing",
    participantId: participant.id,
    participantName: participant.user.name || participant.user.email,
    windowStartMoveIndex,
    windowEndMoveIndex,
  });
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

  params.onStatusChange?.({
    status: "done",
    participantId: participant.id,
    participantName: participant.user.name || participant.user.email,
    windowStartMoveIndex,
    windowEndMoveIndex,
  });

  return {
    created: true as const,
    content,
    windowStartMoveIndex,
    windowEndMoveIndex,
  };
}

function buildFallbackInterventionFromConfig(params: {
  config: InterventionConfigRecord;
  candidate: InterventionCandidate;
}) {
  const { config, candidate } = params;
  const metadata = asPlainObject(config.metadata);
  const replacements: Record<string, string | number | null | undefined> = {
    ...candidate.triggerData,
    triggerLabel: candidate.triggerLabel,
    triggerId: candidate.triggerId,
    turnNumber: candidate.turnNumber,
  };

  const titleTemplate =
    typeof metadata.titleTemplate === "string"
      ? metadata.titleTemplate
      : candidate.fallbackTitle;
  const messageTemplate =
    typeof metadata.messageTemplate === "string"
      ? metadata.messageTemplate
      : candidate.fallbackMessage;
  const reflectionTemplate =
    typeof metadata.reflectionQuestion === "string"
      ? metadata.reflectionQuestion
      : candidate.fallbackReflectionQuestion || "";
  const microActionTemplate =
    typeof metadata.microAction === "string"
      ? metadata.microAction
      : candidate.fallbackMicroAction || "";

  const title = trimToMax(
    renderPromptTemplate(titleTemplate, replacements) || candidate.fallbackTitle,
    INTERVENTION_TITLE_MAX_LENGTH,
  );
  const message = trimToMax(
    renderPromptTemplate(messageTemplate, replacements) ||
      candidate.fallbackMessage,
    INTERVENTION_MESSAGE_MAX_LENGTH,
  );
  const reflectionQuestion = trimToMax(
    renderPromptTemplate(reflectionTemplate, replacements),
    INTERVENTION_REFLECTION_MAX_LENGTH,
  );
  const microAction = trimToMax(
    renderPromptTemplate(microActionTemplate, replacements),
    INTERVENTION_MICRO_ACTION_MAX_LENGTH,
  );

  return {
    title: title || "Intervenção assistida",
    message: message || candidate.fallbackMessage || "Sem mensagem disponível.",
    reflectionQuestion: reflectionQuestion || null,
    microAction: microAction || null,
  };
}

function shouldAutoApproveSensitiveIntervention(params: {
  room: { therapistSoloPlay: boolean; therapistPlays: boolean };
  participants: Array<{ role: string }>;
  config: InterventionConfigRecord;
}) {
  if (!params.config.autoApproveWhenTherapistSolo) return false;
  if (params.room.therapistSoloPlay) return true;

  const therapistCount = params.participants.filter(
    (participant) => participant.role === "THERAPIST",
  ).length;
  const playerCount = params.participants.filter(
    (participant) => participant.role === "PLAYER",
  ).length;

  return params.room.therapistPlays && therapistCount > 0 && playerCount <= 1;
}

async function generateInterventionAiContent(params: {
  roomId: string;
  participantId: string;
  config: InterventionConfigRecord;
  candidate: InterventionCandidate;
}) {
  const prompt = pickBestInterventionPrompt(params.config);
  if (!prompt || !prompt.userPromptTemplate.trim()) return null;

  const [context, participant] = await Promise.all([
    buildAiContext(params.roomId, params.participantId),
    prisma.mahaLilahParticipant.findUnique({
      where: { id: params.participantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  if (!participant) return null;

  const triggerData = params.candidate.triggerData || {};
  const userPrompt = renderPromptTemplate(prompt.userPromptTemplate, {
    contextJson: JSON.stringify(context, null, 2),
    triggerDataJson: JSON.stringify(triggerData, null, 2),
    participantName: participant.user.name || participant.user.email,
    participantIntention: participant.gameIntention || "",
    triggerLabel: params.candidate.triggerLabel,
    triggerId: params.candidate.triggerId,
    houseNumber:
      typeof triggerData.houseNumber === "number"
        ? triggerData.houseNumber
        : "",
    repeatCount:
      typeof triggerData.repeatCount === "number"
        ? triggerData.repeatCount
        : "",
    windowMoves:
      typeof triggerData.windowMoves === "number"
        ? triggerData.windowMoves
        : "",
    snakeCount:
      typeof triggerData.snakeCount === "number"
        ? triggerData.snakeCount
        : "",
    shadowCount:
      typeof triggerData.shadowCount === "number"
        ? triggerData.shadowCount
        : "",
    rollsUntilStart:
      typeof triggerData.rollsUntilStart === "number"
        ? triggerData.rollsUntilStart
        : "",
    inactivityMinutes:
      typeof triggerData.inactivityMinutes === "number"
        ? triggerData.inactivityMinutes
        : "",
    inactivitySeconds:
      typeof triggerData.inactivitySeconds === "number"
        ? triggerData.inactivitySeconds
        : "",
    movesInSession:
      typeof triggerData.movesInSession === "number"
        ? triggerData.movesInSession
        : "",
    fatigueThreshold:
      typeof triggerData.fatigueThreshold === "number"
        ? triggerData.fatigueThreshold
        : "",
    intensityMin:
      typeof triggerData.intensityMin === "number"
        ? triggerData.intensityMin
        : "",
    highIntensityCount:
      typeof triggerData.highIntensityCount === "number"
        ? triggerData.highIntensityCount
        : "",
    intensityWindowEntries:
      typeof triggerData.intensityWindowEntries === "number"
        ? triggerData.intensityWindowEntries
        : "",
    noTherapyWindowMoves:
      typeof triggerData.noTherapyWindowMoves === "number"
        ? triggerData.noTherapyWindowMoves
        : "",
    therapistSilenceMoves:
      typeof triggerData.therapistSilenceMoves === "number"
        ? triggerData.therapistSilenceMoves
        : "",
    currentHouse:
      typeof triggerData.currentHouse === "number" ? triggerData.currentHouse : "",
    survivalWindowMoves:
      typeof triggerData.survivalWindowMoves === "number"
        ? triggerData.survivalWindowMoves
        : "",
    survivalDeepCountDetected:
      typeof triggerData.survivalDeepCountDetected === "number"
        ? triggerData.survivalDeepCountDetected
        : "",
    survivalBroadCountDetected:
      typeof triggerData.survivalBroadCountDetected === "number"
        ? triggerData.survivalBroadCountDetected
        : "",
    survivalConsecutiveCountDetected:
      typeof triggerData.survivalConsecutiveCountDetected === "number"
        ? triggerData.survivalConsecutiveCountDetected
        : "",
    survivalPersistenceWindowMoves:
      typeof triggerData.survivalPersistenceWindowMoves === "number"
        ? triggerData.survivalPersistenceWindowMoves
        : "",
    survivalPersistenceCountDetected:
      typeof triggerData.survivalPersistenceCountDetected === "number"
        ? triggerData.survivalPersistenceCountDetected
        : "",
    rapidRollWindowMoves:
      typeof triggerData.rapidRollWindowMoves === "number"
        ? triggerData.rapidRollWindowMoves
        : "",
    rapidRollMaxAvgSeconds:
      typeof triggerData.rapidRollMaxAvgSeconds === "number"
        ? triggerData.rapidRollMaxAvgSeconds
        : "",
    avgRollSeconds:
      typeof triggerData.avgRollSeconds === "number"
        ? triggerData.avgRollSeconds
        : "",
    fastAscentWindowMoves:
      typeof triggerData.fastAscentWindowMoves === "number"
        ? triggerData.fastAscentWindowMoves
        : "",
    fastAscentMinCount:
      typeof triggerData.fastAscentMinCount === "number"
        ? triggerData.fastAscentMinCount
        : "",
    fastAscentMinDelta:
      typeof triggerData.fastAscentMinDelta === "number"
        ? triggerData.fastAscentMinDelta
        : "",
    fastAscentCount:
      typeof triggerData.fastAscentCount === "number"
        ? triggerData.fastAscentCount
        : "",
    checkpointEveryMoves:
      typeof triggerData.checkpointEveryMoves === "number"
        ? triggerData.checkpointEveryMoves
        : "",
    totalPostStartMoves:
      typeof triggerData.totalPostStartMoves === "number"
        ? triggerData.totalPostStartMoves
        : "",
    turnNumber: params.candidate.turnNumber,
  });

  const aiRaw = await callOpenAIWithMessages({
    userPrompt,
    systemPrompt: prompt.systemPrompt || DEFAULT_OPENAI_SYSTEM_PROMPT,
    temperature: 0.3,
  });
  const parsed = parseInterventionAiPayload(aiRaw);
  return {
    promptId: prompt.id,
    content: parsed,
    raw: aiRaw,
  };
}

async function hasInterventionCooldownActive(params: {
  roomId: string;
  participantId: string;
  triggerId: string;
  currentTurnNumber: number | null;
  cooldownMoves: number;
  cooldownMinutes: number;
}) {
  if (params.cooldownMoves <= 0 && params.cooldownMinutes <= 0) {
    return false;
  }

  const last = await prisma.mahaLilahIntervention.findFirst({
    where: {
      roomId: params.roomId,
      participantId: params.participantId,
      triggerId: params.triggerId,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, turnNumber: true },
  });
  if (!last) return false;

  if (params.cooldownMinutes > 0) {
    const elapsedMs = Date.now() - new Date(last.createdAt).getTime();
    if (elapsedMs <= params.cooldownMinutes * 60_000) {
      return true;
    }
  }

  if (
    params.cooldownMoves > 0 &&
    typeof params.currentTurnNumber === "number" &&
    Number.isFinite(params.currentTurnNumber) &&
    typeof last.turnNumber === "number" &&
    Number.isFinite(last.turnNumber)
  ) {
    const movesDiff = params.currentTurnNumber - last.turnNumber;
    if (movesDiff >= 0 && movesDiff <= params.cooldownMoves) {
      return true;
    }
  }

  return false;
}

async function hasGlobalInterventionCooldownActive(params: {
  roomId: string;
  participantId: string;
  currentTurnNumber: number | null;
}) {
  if (
    INTERVENTION_GLOBAL_COOLDOWN_MOVES <= 0 ||
    params.currentTurnNumber == null ||
    !Number.isFinite(params.currentTurnNumber)
  ) {
    return false;
  }

  const last = await prisma.mahaLilahIntervention.findFirst({
    where: {
      roomId: params.roomId,
      participantId: params.participantId,
    },
    orderBy: { createdAt: "desc" },
    select: { turnNumber: true },
  });
  if (
    typeof last?.turnNumber !== "number" ||
    !Number.isFinite(last.turnNumber)
  ) {
    return false;
  }

  const diff = params.currentTurnNumber - last.turnNumber;
  return diff >= 0 && diff <= INTERVENTION_GLOBAL_COOLDOWN_MOVES;
}

async function isTriggerSnoozed(params: {
  roomId: string;
  participantId: string;
  triggerId: string;
}) {
  const now = new Date();
  const activeSnooze = await prisma.mahaLilahIntervention.findFirst({
    where: {
      roomId: params.roomId,
      participantId: params.participantId,
      triggerId: params.triggerId,
      status: "SNOOZED",
      snoozedUntil: { gt: now },
    },
    select: { id: true },
  });
  return Boolean(activeSnooze);
}

async function isTriggerMutedForSession(params: {
  roomId: string;
  participantId: string;
  triggerId: string;
}) {
  const muted = await prisma.mahaLilahInterventionFeedback.findFirst({
    where: {
      roomId: params.roomId,
      participantId: params.participantId,
      triggerId: params.triggerId,
      action: "DISMISSED",
      note: INTERVENTION_MUTE_SESSION_NOTE,
    },
    select: { id: true },
  });
  return Boolean(muted);
}

async function createInterventionFromCandidate(params: {
  room: {
    id: string;
    therapistSoloPlay: boolean;
    therapistPlays: boolean;
  };
  roomParticipants: Array<{ role: string }>;
  participantId: string;
  candidate: InterventionCandidate;
  config: InterventionConfigRecord;
}) {
  const { room, roomParticipants, participantId, candidate, config } = params;

  if (
    await isTriggerMutedForSession({
      roomId: room.id,
      participantId,
      triggerId: candidate.triggerId,
    })
  ) {
    return null;
  }

  if (
    await isTriggerSnoozed({
      roomId: room.id,
      participantId,
      triggerId: candidate.triggerId,
    })
  ) {
    return null;
  }

  const effectiveTriggerCooldownMoves = Math.max(
    INTERVENTION_MIN_TRIGGER_COOLDOWN_MOVES,
    Math.max(0, config.cooldownMoves || 0),
  );

  const cooldownActive = await hasInterventionCooldownActive({
    roomId: room.id,
    participantId,
    triggerId: candidate.triggerId,
    currentTurnNumber: candidate.turnNumber,
    cooldownMoves: effectiveTriggerCooldownMoves,
    cooldownMinutes: config.cooldownMinutes,
  });
  if (cooldownActive) return null;

  const globalCooldownActive = await hasGlobalInterventionCooldownActive({
    roomId: room.id,
    participantId,
    currentTurnNumber: candidate.turnNumber,
  });
  if (globalCooldownActive) return null;

  const fallbackContent = buildFallbackInterventionFromConfig({
    config,
    candidate,
  });

  let finalContent = fallbackContent;
  let generatedBy: InterventionSource = "RULE";
  let promptId: string | null = null;
  let aiRawContent: string | null = null;
  const useAiRequested =
    config.aiPolicy === "REQUIRED" ||
    (config.aiPolicy === "OPTIONAL" && config.useAi);

  if (useAiRequested) {
    try {
      const aiResult = await generateInterventionAiContent({
        roomId: room.id,
        participantId,
        config,
        candidate,
      });
      if (aiResult?.content) {
        finalContent = aiResult.content;
        generatedBy = "AI";
        promptId = aiResult.promptId;
        aiRawContent = aiResult.raw;
      } else {
        generatedBy = "HYBRID";
      }
    } catch (error) {
      generatedBy = "HYBRID";
      console.error(
        `[mahalilah-realtime] falha ao gerar intervenção com IA (${candidate.triggerId}):`,
        error,
      );
    }
  }

  const autoApproveSensitive = shouldAutoApproveSensitiveIntervention({
    room,
    participants: roomParticipants,
    config,
  });
  const requiresApproval = Boolean(
    (config.sensitive || config.requireTherapistApproval) &&
      !autoApproveSensitive,
  );
  const status: InterventionStatus = requiresApproval
    ? "PENDING_APPROVAL"
    : "APPROVED";
  const visibleTo: InterventionVisibility = candidate.visibleTo
    ? candidate.visibleTo
    : requiresApproval
      ? "THERAPIST_ONLY"
      : "ROOM";

  const created = await prisma.mahaLilahIntervention.create({
    data: {
      roomId: room.id,
      participantId,
      moveId: candidate.moveId,
      configId: config.id,
      promptId,
      triggerId: candidate.triggerId,
      severity: config.severity,
      generatedBy,
      usesAi: useAiRequested,
      requiresApproval,
      status,
      visibleTo,
      turnNumber: candidate.turnNumber,
      title: trimToMax(finalContent.title, INTERVENTION_TITLE_MAX_LENGTH),
      message: trimToMax(finalContent.message, INTERVENTION_MESSAGE_MAX_LENGTH),
      reflectionQuestion: finalContent.reflectionQuestion,
      microAction: finalContent.microAction,
      snoozedUntil: null,
      approvedAt: status === "APPROVED" ? new Date() : null,
      metadata: {
        triggerLabel: candidate.triggerLabel,
        triggerData: candidate.triggerData,
        fallbackUsed: generatedBy !== "AI",
        aiRawContent,
        autoApproveSensitive,
        aiPolicy: config.aiPolicy,
        configScopeType: config.scopeType,
        configScopeId: config.scopeId,
        configVersion: config.version,
      } as any,
    },
    include: {
      participant: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      move: {
        select: { id: true, turnNumber: true },
      },
    },
  });

  return created;
}

async function evaluateInterventionsAfterMove(params: {
  roomId: string;
  participantId: string;
  moveId: string;
}) {
  const [
    room,
    allMoves,
    playerState,
    participantTherapyEntries,
    participantSurvivalInterventions,
  ] = await Promise.all([
    prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        status: true,
        planType: true,
        orderId: true,
        isTrial: true,
        subscriptionId: true,
        createdByUserId: true,
        therapistSoloPlay: true,
        therapistPlays: true,
        participants: {
          select: {
            id: true,
            role: true,
            userId: true,
          },
        },
      },
    }),
    prisma.mahaLilahMove.findMany({
      where: { roomId: params.roomId, participantId: params.participantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        turnNumber: true,
        diceValue: true,
        fromPos: true,
        toPos: true,
        appliedJumpFrom: true,
        appliedJumpTo: true,
        createdAt: true,
      },
    }),
    prisma.mahaLilahPlayerState.findFirst({
      where: {
        roomId: params.roomId,
        participantId: params.participantId,
      },
      select: {
        hasStarted: true,
        rollCountUntilStart: true,
      },
    }),
    prisma.mahaLilahTherapyEntry.findMany({
      where: {
        roomId: params.roomId,
        participantId: params.participantId,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        moveId: true,
        intensity: true,
        createdAt: true,
      },
    }),
    prisma.mahaLilahIntervention.findMany({
      where: {
        roomId: params.roomId,
        participantId: params.participantId,
        triggerId: {
          in: ["survival_mode_alert", "survival_mode_persistence"],
        },
      },
      select: {
        triggerId: true,
      },
    }),
  ]);

  if (!room || (room.status !== "ACTIVE" && room.status !== "COMPLETED")) {
    return [];
  }
  const configsByTrigger = await loadInterventionConfigsByTriggerIdForRoom({
    roomId: room.id,
    planType: room.planType,
  });

  const limitConfig = await getRoomAiLimits({
    id: room.id,
    planType: room.planType,
    orderId: room.orderId,
    isTrial: room.isTrial,
    subscriptionId: room.subscriptionId,
    createdByUserId: room.createdByUserId,
  });
  const interventionsLimit = Math.max(
    0,
    Number(limitConfig.interventionLimitPerParticipant || 0),
  );
  if (interventionsLimit <= 0) return [];

  const currentMove = allMoves.find((item) => item.id === params.moveId);
  if (!currentMove) return [];

  const postStartMoves = allMoves.filter(isPostStartMove);
  const postStartMoveCount = postStartMoves.length;
  const resolveMoveHouseNumber = (move: {
    toPos: number;
    appliedJumpFrom: number | null;
    appliedJumpTo: number | null;
  }) => move.appliedJumpTo ?? move.appliedJumpFrom ?? move.toPos;
  const currentHouseNumber = resolveMoveHouseNumber(currentMove);
  const candidates: InterventionCandidate[] = [];

  const registerCandidate = (
    candidate: Omit<InterventionCandidate, "participantId"> & {
      participantId?: string;
    },
  ) => {
    const normalized = {
      ...candidate,
      participantId: candidate.participantId || params.participantId,
    } as InterventionCandidate;
    if (
      candidates.some(
        (item) =>
          item.triggerId === normalized.triggerId &&
          item.participantId === normalized.participantId,
      )
    ) {
      return;
    }
    candidates.push(normalized);
  };

  const pickEnabledConfig = (...triggerIds: string[]) =>
    triggerIds
      .map((triggerId) => configsByTrigger.get(triggerId))
      .find((config): config is InterventionConfigRecord => Boolean(config?.enabled));

  const isShadowHouse = (houseNumber: number) => {
    const house = getHouseByNumber(houseNumber);
    const text = `${house?.title || ""} ${house?.description || ""}`.toLowerCase();
    const shadowKeywords = [
      "ilusão",
      "raiva",
      "ganância",
      "aversão",
      "nulidade",
      "ciúme",
      "tristeza",
      "desalinhamento",
      "ignorância",
      "violência",
      "inveja",
    ];
    return shadowKeywords.some((keyword) => text.includes(keyword));
  };

  const repeatConfig = pickEnabledConfig(
    "repeat_house_short",
    "HOUSE_REPEAT_AI",
    "HOUSE_REPEAT_PATTERN",
  );
  if (repeatConfig) {
    const repeatThreshold = Math.max(2, repeatConfig.thresholds.houseRepeatCount || 0);
    const windowMoves = Math.max(
      repeatThreshold,
      repeatConfig.thresholds.repeatedHouseWindowMoves || repeatThreshold,
    );
    if (repeatThreshold > 0 && windowMoves > 0) {
      const windowSlice = postStartMoves.slice(-windowMoves);
      if (windowSlice.length >= repeatThreshold) {
        const houseToTrack =
          currentMove.appliedJumpTo ??
          currentMove.appliedJumpFrom ??
          currentMove.toPos;
        const repeatCount = windowSlice.filter((item) => {
          const house = item.appliedJumpTo ?? item.appliedJumpFrom ?? item.toPos;
          return house === houseToTrack;
        }).length;
        if (repeatCount >= repeatThreshold) {
          const houseMeta = getHouseByNumber(houseToTrack);
          registerCandidate({
            triggerId: repeatConfig.triggerId,
            triggerLabel: repeatConfig.title,
            severity: repeatConfig.severity,
            turnNumber: currentMove.turnNumber,
            moveId: currentMove.id,
            triggerData: {
              houseNumber: houseToTrack,
              houseTitle: houseMeta?.title || null,
              repeatCount,
              windowMoves,
            },
            fallbackTitle: `Repetição na casa ${houseToTrack}`,
            fallbackMessage: `A casa ${houseToTrack} (${houseMeta?.title || "sem título"}) apareceu ${repeatCount} vezes nas últimas ${windowMoves} jogadas.`,
            fallbackReflectionQuestion:
              "Qual aprendizado ainda está pedindo atenção nesta repetição?",
            fallbackMicroAction:
              "Anote um comportamento concreto para aplicar antes da próxima rolagem.",
          });
        }
      }
    }
  }

  const snakeConfig = pickEnabledConfig("double_snake", "SNAKE_STREAK_PATTERN");
  if (snakeConfig?.enabled) {
    const snakeThreshold = Math.max(2, snakeConfig.thresholds.snakeStreakCount || 0);
    const snakeWindow = Math.max(
      snakeThreshold,
      snakeConfig.thresholds.snakeWindowMoves || snakeThreshold,
    );
    if (snakeThreshold > 0) {
      const recentWindow = postStartMoves.slice(-snakeWindow);
      const snakeCount = recentWindow.filter(
        (item) =>
          item.appliedJumpFrom !== null &&
          item.appliedJumpTo !== null &&
          item.appliedJumpTo < item.appliedJumpFrom,
      ).length;
      if (snakeCount >= snakeThreshold) {
        registerCandidate({
          triggerId: snakeConfig.triggerId,
          triggerLabel: snakeConfig.title,
          severity: snakeConfig.severity,
          turnNumber: currentMove.turnNumber,
          moveId: currentMove.id,
          triggerData: {
            snakeCount,
            windowMoves: recentWindow.length,
          },
          fallbackTitle: "Sequência de descidas",
          fallbackMessage: `Foram detectadas ${snakeCount} descidas em sequência nas últimas jogadas.`,
          fallbackReflectionQuestion:
            "O que este padrão repetido de descida está sinalizando sobre seu momento atual?",
          fallbackMicroAction:
            "Faça uma pausa de 30 segundos e registre o principal gatilho percebido antes de seguir.",
        });
      }
    }
  }

  const rapidRollConfig = pickEnabledConfig("roll_rush_pattern");
  if (rapidRollConfig?.enabled) {
    const rapidRollWindowMoves = Math.max(
      3,
      rapidRollConfig.thresholds.rapidRollWindowMoves || 5,
    );
    const rapidRollMaxAvgSeconds = Math.max(
      1,
      rapidRollConfig.thresholds.rapidRollMaxAvgSeconds || 2,
    );
    const rapidWindow = postStartMoves.slice(-rapidRollWindowMoves);
    if (rapidWindow.length >= 3) {
      const intervalsSeconds: number[] = [];
      for (let index = 1; index < rapidWindow.length; index += 1) {
        const previous = new Date(rapidWindow[index - 1].createdAt).getTime();
        const current = new Date(rapidWindow[index].createdAt).getTime();
        const diffSeconds = Math.max(0, (current - previous) / 1000);
        intervalsSeconds.push(diffSeconds);
      }

      if (intervalsSeconds.length > 0) {
        const avgRollSeconds =
          intervalsSeconds.reduce((sum, item) => sum + item, 0) /
          intervalsSeconds.length;
        if (avgRollSeconds <= rapidRollMaxAvgSeconds) {
          registerCandidate({
            triggerId: rapidRollConfig.triggerId,
            triggerLabel: rapidRollConfig.title,
            severity: rapidRollConfig.severity,
            turnNumber: currentMove.turnNumber,
            moveId: currentMove.id,
            triggerData: {
              rapidRollWindowMoves: rapidWindow.length,
              rapidRollMaxAvgSeconds,
              avgRollSeconds: Number(avgRollSeconds.toFixed(1)),
            },
            fallbackTitle: "Ritmo acelerado de rolagem",
            fallbackMessage: `As últimas ${rapidWindow.length} jogadas ocorreram em média de ${avgRollSeconds.toFixed(1)}s entre rolagens.`,
            fallbackReflectionQuestion:
              "O que muda se você fizer uma pausa curta antes da próxima rolagem?",
            fallbackMicroAction:
              "Respire por 3 ciclos lentos, nomeie sua intenção e só então role novamente.",
          });
        }
      }
    }
  }

  const fastAscentConfig = pickEnabledConfig("fast_ascent_alert");
  if (fastAscentConfig?.enabled) {
    const fastAscentWindowMoves = Math.max(
      2,
      fastAscentConfig.thresholds.fastAscentWindowMoves || 6,
    );
    const fastAscentMinCount = Math.max(
      1,
      fastAscentConfig.thresholds.fastAscentMinCount || 2,
    );
    const fastAscentMinDelta = Math.max(
      1,
      fastAscentConfig.thresholds.fastAscentMinDelta || 8,
    );
    const ascentWindow = postStartMoves.slice(-fastAscentWindowMoves);
    const ascentMoves = ascentWindow.filter((move) => {
      if (move.appliedJumpFrom == null || move.appliedJumpTo == null) return false;
      const delta = move.appliedJumpTo - move.appliedJumpFrom;
      return delta >= fastAscentMinDelta;
    });
    const currentMoveAscentDelta =
      currentMove.appliedJumpFrom != null && currentMove.appliedJumpTo != null
        ? currentMove.appliedJumpTo - currentMove.appliedJumpFrom
        : 0;

    if (
      ascentMoves.length >= fastAscentMinCount &&
      currentMoveAscentDelta >= fastAscentMinDelta
    ) {
      registerCandidate({
        triggerId: fastAscentConfig.triggerId,
        triggerLabel: fastAscentConfig.title,
        severity: fastAscentConfig.severity,
        turnNumber: currentMove.turnNumber,
        moveId: currentMove.id,
        triggerData: {
          fastAscentCount: ascentMoves.length,
          fastAscentWindowMoves: ascentWindow.length,
          fastAscentMinCount,
          fastAscentMinDelta,
          currentAscentDelta: currentMoveAscentDelta,
        },
        fallbackTitle: "Subida acelerada por atalhos",
        fallbackMessage: `Você teve ${ascentMoves.length} subidas relevantes em ${ascentWindow.length} jogadas. A evolução é positiva, e pede integração consciente para sustentar o ganho.`,
        fallbackReflectionQuestion:
          "O que precisa ser interiorizado agora para evitar uma queda por aceleração?",
        fallbackMicroAction:
          "Faça uma pausa de aterramento e registre um aprendizado concreto desta subida.",
      });
    }
  }

  const preStartConfig = pickEnabledConfig("start_lock", "PRE_START_STUCK_PATTERN");
  if (preStartConfig?.enabled && playerState && !playerState.hasStarted) {
    const threshold = Math.max(2, preStartConfig.thresholds.preStartRollCount || 0);
    if (
      threshold > 0 &&
      playerState.rollCountUntilStart >= threshold &&
      currentMove.diceValue !== 6
    ) {
      registerCandidate({
        triggerId: preStartConfig.triggerId,
        triggerLabel: preStartConfig.title,
        severity: preStartConfig.severity,
        turnNumber: currentMove.turnNumber,
        moveId: currentMove.id,
        triggerData: {
          rollsUntilStart: playerState.rollCountUntilStart,
        },
        fallbackTitle: "Demora para iniciar",
        fallbackMessage: `Já ocorreram ${playerState.rollCountUntilStart} tentativas sem iniciar a jornada.`,
        fallbackReflectionQuestion:
          "O que pode tornar o início deste processo mais seguro e possível agora?",
        fallbackMicroAction:
          "Escolha uma micro intenção de abertura para a próxima jogada.",
      });
    }
  }

  const shadowStreakConfig = pickEnabledConfig("shadow_streak");
  if (shadowStreakConfig?.enabled) {
    const shadowThreshold = Math.max(
      2,
      shadowStreakConfig.thresholds.shadowStreakCount || 3,
    );
    if (postStartMoves.length >= shadowThreshold) {
      const recentHouses = postStartMoves
        .slice(-shadowThreshold)
        .map((move) => move.appliedJumpTo ?? move.appliedJumpFrom ?? move.toPos);
      const shadowCount = recentHouses.filter((houseNumber) =>
        isShadowHouse(houseNumber),
      ).length;
      if (shadowCount >= shadowThreshold) {
        registerCandidate({
          triggerId: shadowStreakConfig.triggerId,
          triggerLabel: shadowStreakConfig.title,
          severity: shadowStreakConfig.severity,
          turnNumber: currentMove.turnNumber,
          moveId: currentMove.id,
          triggerData: {
            shadowCount,
            shadowThreshold,
            recentShadowHouses: recentHouses,
          },
          fallbackTitle: "Sequência de casas sombra",
          fallbackMessage: `Foram detectadas ${shadowCount} casas sombra seguidas. Esse padrão pede atenção terapêutica cuidadosa.`,
          fallbackReflectionQuestion:
            "Que tema emocional recorrente está pedindo acolhimento e integração agora?",
          fallbackMicroAction:
            "Pausa breve: nomeie o tema dominante em uma frase antes de seguir.",
        });
      }
    }
  }

  const survivalAlertConfig = pickEnabledConfig("survival_mode_alert");
  if (survivalAlertConfig?.enabled) {
    const survivalIgnoreInitialMoves = Math.max(
      0,
      survivalAlertConfig.thresholds.survivalIgnoreInitialMoves || 2,
    );
    const survivalDeepMaxHouse = Math.max(
      1,
      survivalAlertConfig.thresholds.survivalDeepMaxHouse || 9,
    );
    const survivalBroadMaxHouse = Math.max(
      survivalDeepMaxHouse,
      survivalAlertConfig.thresholds.survivalBroadMaxHouse || 18,
    );
    const survivalWindowMoves = Math.max(
      1,
      survivalAlertConfig.thresholds.survivalWindowMoves || 10,
    );
    const survivalDeepCountThreshold = Math.max(
      1,
      survivalAlertConfig.thresholds.survivalDeepCount || 4,
    );
    const survivalBroadCountThreshold = Math.max(
      survivalDeepCountThreshold,
      survivalAlertConfig.thresholds.survivalBroadCount || 7,
    );
    const survivalConsecutiveMaxHouse = Math.max(
      1,
      survivalAlertConfig.thresholds.survivalConsecutiveMaxHouse ||
        survivalDeepMaxHouse,
    );
    const survivalConsecutiveCountThreshold = Math.max(
      1,
      survivalAlertConfig.thresholds.survivalConsecutiveCount || 4,
    );
    const eligibleMoves = postStartMoves.slice(survivalIgnoreInitialMoves);
    const recentSurvivalMoves = eligibleMoves.slice(-survivalWindowMoves);
    const recentSurvivalHouses = recentSurvivalMoves.map(resolveMoveHouseNumber);
    const survivalDeepCountDetected = recentSurvivalHouses.filter(
      (house) => house <= survivalDeepMaxHouse,
    ).length;
    const survivalBroadCountDetected = recentSurvivalHouses.filter(
      (house) => house <= survivalBroadMaxHouse,
    ).length;
    let survivalConsecutiveCountDetected = 0;
    for (let index = recentSurvivalHouses.length - 1; index >= 0; index -= 1) {
      if (recentSurvivalHouses[index] <= survivalConsecutiveMaxHouse) {
        survivalConsecutiveCountDetected += 1;
      } else {
        break;
      }
    }

    const shouldTriggerSurvivalAlert =
      currentHouseNumber <= survivalBroadMaxHouse &&
      (survivalDeepCountDetected >= survivalDeepCountThreshold ||
        survivalBroadCountDetected >= survivalBroadCountThreshold ||
        survivalConsecutiveCountDetected >= survivalConsecutiveCountThreshold);

    if (shouldTriggerSurvivalAlert) {
      registerCandidate({
        triggerId: survivalAlertConfig.triggerId,
        triggerLabel: survivalAlertConfig.title,
        severity: survivalAlertConfig.severity,
        turnNumber: currentMove.turnNumber,
        moveId: currentMove.id,
        triggerData: {
          currentHouse: currentHouseNumber,
          survivalWindowMoves: recentSurvivalHouses.length,
          survivalDeepMaxHouse,
          survivalBroadMaxHouse,
          survivalDeepCountDetected,
          survivalDeepCountThreshold,
          survivalBroadCountDetected,
          survivalBroadCountThreshold,
          survivalConsecutiveMaxHouse,
          survivalConsecutiveCountDetected,
          survivalConsecutiveCountThreshold,
          recentSurvivalHouses,
        },
        fallbackTitle: "Sinal de modo sobrevivência",
        fallbackMessage: `Nas últimas ${recentSurvivalHouses.length} jogadas, houve concentração nas casas iniciais (até ${survivalBroadMaxHouse}).`,
        fallbackReflectionQuestion:
          "O que está mantendo sua energia em proteção e evitando expansão neste momento?",
        fallbackMicroAction:
          "Escolha uma ação simples de autorregulação e registre uma intenção de avanço para as próximas jogadas.",
      });
    }
  }

  const survivalPersistenceConfig = pickEnabledConfig("survival_mode_persistence");
  if (survivalPersistenceConfig?.enabled) {
    const previousAlertCount = participantSurvivalInterventions.filter(
      (item) => item.triggerId === "survival_mode_alert",
    ).length;
    if (previousAlertCount > 0) {
      const survivalIgnoreInitialMoves = Math.max(
        0,
        survivalPersistenceConfig.thresholds.survivalIgnoreInitialMoves || 2,
      );
      const survivalPersistenceWindowMoves = Math.max(
        1,
        survivalPersistenceConfig.thresholds.survivalPersistenceWindowMoves || 14,
      );
      const survivalPersistenceMaxHouse = Math.max(
        1,
        survivalPersistenceConfig.thresholds.survivalPersistenceMaxHouse || 18,
      );
      const survivalPersistenceCountThreshold = Math.max(
        1,
        survivalPersistenceConfig.thresholds.survivalPersistenceCount || 10,
      );
      const eligibleMoves = postStartMoves.slice(survivalIgnoreInitialMoves);
      const recentSurvivalMoves = eligibleMoves.slice(-survivalPersistenceWindowMoves);
      const recentSurvivalHouses = recentSurvivalMoves.map(resolveMoveHouseNumber);
      const survivalPersistenceCountDetected = recentSurvivalHouses.filter(
        (house) => house <= survivalPersistenceMaxHouse,
      ).length;

      if (
        currentHouseNumber <= survivalPersistenceMaxHouse &&
        survivalPersistenceCountDetected >= survivalPersistenceCountThreshold
      ) {
        registerCandidate({
          triggerId: survivalPersistenceConfig.triggerId,
          triggerLabel: survivalPersistenceConfig.title,
          severity: survivalPersistenceConfig.severity,
          turnNumber: currentMove.turnNumber,
          moveId: currentMove.id,
          triggerData: {
            currentHouse: currentHouseNumber,
            previousAlertCount,
            survivalPersistenceWindowMoves: recentSurvivalHouses.length,
            survivalPersistenceMaxHouse,
            survivalPersistenceCountDetected,
            survivalPersistenceCountThreshold,
            recentSurvivalHouses,
          },
          fallbackTitle: "Persistência no modo sobrevivência",
          fallbackMessage: `Mesmo após alerta prévio, o padrão de permanência nas casas até ${survivalPersistenceMaxHouse} continua forte.`,
          fallbackReflectionQuestion:
            "Qual suporte terapêutico é necessário agora para sair do ciclo de sobrevivência e ampliar recursos internos?",
          fallbackMicroAction:
            "Faça uma intervenção breve orientada a segurança e registre o próximo passo concreto antes da nova rolagem.",
        });
      }
    }
  }

  const noTherapyAfterStrongMoveConfig = pickEnabledConfig(
    "no_therapy_after_strong_move",
  );
  if (noTherapyAfterStrongMoveConfig?.enabled && postStartMoves.length >= 3) {
    const noTherapyWindowMoves = Math.max(
      1,
      noTherapyAfterStrongMoveConfig.thresholds.noTherapyWindowMoves || 2,
    );
    const strongMoveMinDelta = Math.max(
      1,
      noTherapyAfterStrongMoveConfig.thresholds.strongMoveMinDelta || 8,
    );

    let strongMoveIndex = -1;
    for (let index = postStartMoves.length - 1; index >= 0; index -= 1) {
      const move = postStartMoves[index];
      const jumpDelta =
        move.appliedJumpFrom != null && move.appliedJumpTo != null
          ? Math.abs(move.appliedJumpFrom - move.appliedJumpTo)
          : 0;
      if (jumpDelta >= strongMoveMinDelta) {
        strongMoveIndex = index;
        break;
      }
    }

    if (strongMoveIndex >= 0) {
      const movesSinceStrong = postStartMoves.length - 1 - strongMoveIndex;
      if (movesSinceStrong >= noTherapyWindowMoves) {
        const windowMoveIds = postStartMoves
          .slice(strongMoveIndex + 1, strongMoveIndex + 1 + noTherapyWindowMoves)
          .map((move) => move.id);
        const hasTherapyInWindow = participantTherapyEntries.some(
          (entry) => entry.moveId && windowMoveIds.includes(entry.moveId),
        );

        if (!hasTherapyInWindow) {
          registerCandidate({
            triggerId: noTherapyAfterStrongMoveConfig.triggerId,
            triggerLabel: noTherapyAfterStrongMoveConfig.title,
            severity: noTherapyAfterStrongMoveConfig.severity,
            turnNumber: currentMove.turnNumber,
            moveId: currentMove.id,
            triggerData: {
              noTherapyWindowMoves,
              strongMoveMinDelta,
              strongMoveTurnNumber: postStartMoves[strongMoveIndex]?.turnNumber,
            },
            fallbackTitle: "Sem registro terapêutico após jogada intensa",
            fallbackMessage: `Após uma jogada intensa, não houve registro terapêutico nas ${noTherapyWindowMoves} jogadas seguintes.`,
            fallbackReflectionQuestion:
              "O que ficou sem nome ou sem elaboração depois dessa virada?",
            fallbackMicroAction:
              "Registre em uma frase o principal impacto emocional dessa sequência.",
          });
        }
      }
    }
  }

  const highIntensityConfig = pickEnabledConfig("high_intensity_recurrence");
  if (highIntensityConfig?.enabled) {
    const intensityMin = Math.max(1, highIntensityConfig.thresholds.intensityMin || 8);
    const intensityRepeatCount = Math.max(
      2,
      highIntensityConfig.thresholds.intensityRepeatCount || 3,
    );
    const intensityWindowEntries = Math.max(
      intensityRepeatCount,
      highIntensityConfig.thresholds.intensityWindowEntries || 5,
    );
    const recentEntries = participantTherapyEntries.slice(-intensityWindowEntries);
    const highIntensityCount = recentEntries.filter(
      (entry) =>
        typeof entry.intensity === "number" && entry.intensity >= intensityMin,
    ).length;

    if (highIntensityCount >= intensityRepeatCount) {
      registerCandidate({
        triggerId: highIntensityConfig.triggerId,
        triggerLabel: highIntensityConfig.title,
        severity: highIntensityConfig.severity,
        turnNumber: currentMove.turnNumber,
        moveId: currentMove.id,
        triggerData: {
          intensityMin,
          highIntensityCount,
          intensityWindowEntries,
        },
        fallbackTitle: "Recorrência de alta intensidade",
        fallbackMessage: `A intensidade emocional alta (>= ${intensityMin}) apareceu ${highIntensityCount} vezes em registros recentes.`,
        fallbackReflectionQuestion:
          "Que padrão emocional recorrente está pedindo suporte terapêutico neste momento?",
        fallbackMicroAction:
          "Antes da próxima jogada, faça uma micro regulação e registre o estado atual.",
      });
    }
  }

  const checkpointConfig = pickEnabledConfig("path_checkpoint_reflection");
  if (checkpointConfig?.enabled && postStartMoveCount > 0) {
    const checkpointEveryMoves = Math.max(
      1,
      checkpointConfig.thresholds.checkpointEveryMoves ||
        Number(limitConfig.progressSummaryEveryMoves || 0) ||
        10,
    );
    if (postStartMoveCount % checkpointEveryMoves === 0) {
      const checkpointWindow = postStartMoves.slice(-checkpointEveryMoves);
      const checkpointHouses = checkpointWindow.map(resolveMoveHouseNumber);
      const housesFrequency = checkpointHouses.reduce<Record<number, number>>(
        (acc, houseNumber) => {
          acc[houseNumber] = (acc[houseNumber] || 0) + 1;
          return acc;
        },
        {},
      );
      const recurrentHousesText = Object.entries(housesFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([house, count]) => `Casa ${house} (${count}x)`)
        .join(", ");
      const checkpointAscentCount = checkpointWindow.filter(
        (move) =>
          move.appliedJumpFrom != null &&
          move.appliedJumpTo != null &&
          move.appliedJumpTo > move.appliedJumpFrom,
      ).length;
      const checkpointDescentCount = checkpointWindow.filter(
        (move) =>
          move.appliedJumpFrom != null &&
          move.appliedJumpTo != null &&
          move.appliedJumpTo < move.appliedJumpFrom,
      ).length;

      registerCandidate({
        triggerId: checkpointConfig.triggerId,
        triggerLabel: checkpointConfig.title,
        severity: checkpointConfig.severity,
        turnNumber: currentMove.turnNumber,
        moveId: currentMove.id,
        triggerData: {
          checkpointEveryMoves,
          totalPostStartMoves: postStartMoveCount,
          checkpointAscentCount,
          checkpointDescentCount,
          recurrentHouses: recurrentHousesText,
        },
        fallbackTitle: "Ponto de integração do caminho",
        fallbackMessage: `Você concluiu ${postStartMoveCount} jogadas pós-início. No último ciclo de ${checkpointEveryMoves}, casas recorrentes: ${recurrentHousesText || "sem repetição relevante"}.`,
        fallbackReflectionQuestion:
          "Qual aprendizado deste ciclo precisa ser consolidado antes de seguir?",
        fallbackMicroAction:
          "Feche os olhos por 3 respirações profundas e medite por 1 minuto no próximo passo consciente.",
      });
    }
  }

  const finalCounselConfig = pickEnabledConfig("final_house_counsel");
  if (
    finalCounselConfig?.enabled &&
    currentHouseNumber === START_INDEX + 1 &&
    postStartMoveCount > 0
  ) {
    registerCandidate({
      triggerId: finalCounselConfig.triggerId,
      triggerLabel: finalCounselConfig.title,
      severity: finalCounselConfig.severity,
      turnNumber: currentMove.turnNumber,
      moveId: currentMove.id,
      triggerData: {
        currentHouse: currentHouseNumber,
        totalPostStartMoves: postStartMoveCount,
        completedAt: currentMove.createdAt.toISOString(),
      },
      fallbackTitle: "Conselho final da jornada",
      fallbackMessage:
        "Você chegou ao fechamento do ciclo. Integre os aprendizados principais antes de iniciar um novo movimento.",
      fallbackReflectionQuestion:
        "Qual compromisso interno você assume para sustentar esse aprendizado na vida prática?",
      fallbackMicroAction:
        "Registre três insights centrais da jornada e uma ação concreta para os próximos 7 dias.",
    });
  }

  if (candidates.length === 0) return [];

  const uniqueParticipantIds = Array.from(
    new Set(candidates.map((candidate) => candidate.participantId)),
  );
  const usedByParticipant = new Map<string, number>();
  await Promise.all(
    uniqueParticipantIds.map(async (participantId) => {
      const usedCount = await prisma.mahaLilahIntervention.count({
        where: {
          roomId: room.id,
          participantId,
        },
      });
      usedByParticipant.set(participantId, usedCount);
    }),
  );
  if (
    uniqueParticipantIds.every(
      (participantId) =>
        (usedByParticipant.get(participantId) || 0) >= interventionsLimit,
    )
  ) {
    return [];
  }

  const severityPriority: Record<InterventionSeverity, number> = {
    CRITICAL: 3,
    ATTENTION: 2,
    INFO: 1,
  };
  const triggerPriority: Record<string, number> = {
    final_house_counsel: 100,
    survival_mode_persistence: 80,
    high_intensity_recurrence: 70,
    shadow_streak: 60,
    double_snake: 50,
    path_checkpoint_reflection: -10,
  };
  candidates.sort((a, b) => {
    const aPriority = severityPriority[a.severity] || 0;
    const bPriority = severityPriority[b.severity] || 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    const aTriggerPriority = triggerPriority[a.triggerId] || 0;
    const bTriggerPriority = triggerPriority[b.triggerId] || 0;
    if (aTriggerPriority !== bTriggerPriority) {
      return bTriggerPriority - aTriggerPriority;
    }
    const aTurn = typeof a.turnNumber === "number" ? a.turnNumber : -1;
    const bTurn = typeof b.turnNumber === "number" ? b.turnNumber : -1;
    return bTurn - aTurn;
  });

  const createdInterventions: Array<{
    id: string;
    participantId: string;
    status: InterventionStatus;
    triggerId: string;
    title: string;
  }> = [];

  for (const candidate of candidates) {
    const usedForParticipant = usedByParticipant.get(candidate.participantId) || 0;
    if (usedForParticipant >= interventionsLimit) continue;

    const config = configsByTrigger.get(candidate.triggerId);
    if (!config || !config.enabled) continue;

    const created = await createInterventionFromCandidate({
      room: {
        id: room.id,
        therapistSoloPlay: room.therapistSoloPlay,
        therapistPlays: room.therapistPlays,
      },
      roomParticipants: room.participants,
      participantId: candidate.participantId,
      candidate,
      config,
    });
    if (!created) continue;

    usedByParticipant.set(candidate.participantId, usedForParticipant + 1);
    createdInterventions.push({
      id: created.id,
      participantId: created.participantId,
      status: created.status as InterventionStatus,
      triggerId: created.triggerId,
      title: created.title,
    });
  }

  return createdInterventions;
}

async function evaluateTemporalInterventionsForRoom(params: { roomId: string }) {
  const room = await prisma.mahaLilahRoom.findUnique({
    where: { id: params.roomId },
    select: {
      id: true,
      status: true,
      planType: true,
      orderId: true,
      isTrial: true,
      subscriptionId: true,
      createdByUserId: true,
      therapistSoloPlay: true,
      therapistPlays: true,
      gameState: {
        select: {
          currentTurnIndex: true,
          turnStartedAt: true,
        },
      },
      participants: {
        select: {
          id: true,
          role: true,
          userId: true,
        },
      },
      moves: {
        orderBy: { createdAt: "desc" },
        take: 250,
        select: {
          id: true,
          participantId: true,
          turnNumber: true,
          fromPos: true,
          toPos: true,
          diceValue: true,
          createdAt: true,
        },
      },
    },
  });
  if (!room || room.status !== "ACTIVE") return [];

  const turnParticipants = getTurnParticipants(
    room.participants,
    room.therapistPlays,
    room.therapistSoloPlay,
  );
  if (turnParticipants.length === 0) return [];

  const safeTurnIndex =
    (room.gameState?.currentTurnIndex ?? 0) % turnParticipants.length;
  const activeTurnParticipant = turnParticipants[safeTurnIndex];
  if (!activeTurnParticipant) return [];

  const turnStartedAt = room.gameState?.turnStartedAt || new Date();
  const elapsedMs = Date.now() - new Date(turnStartedAt).getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  const configsByTrigger = await loadInterventionConfigsByTriggerIdForRoom({
    roomId: room.id,
    planType: room.planType,
  });
  const pickEnabledConfig = (...triggerIds: string[]) =>
    triggerIds
      .map((triggerId) => configsByTrigger.get(triggerId))
      .find((config): config is InterventionConfigRecord => Boolean(config?.enabled));

  const latestTurnByParticipant = new Map<string, number>();
  room.moves.forEach((move) => {
    const current = latestTurnByParticipant.get(move.participantId) || 0;
    if (move.turnNumber > current) {
      latestTurnByParticipant.set(move.participantId, move.turnNumber);
    }
  });
  const getLatestTurn = (participantId: string) =>
    latestTurnByParticipant.get(participantId) ?? null;

  const candidates: InterventionCandidate[] = [];
  const registerCandidate = (candidate: InterventionCandidate) => {
    if (
      candidates.some(
        (item) =>
          item.triggerId === candidate.triggerId &&
          item.participantId === candidate.participantId,
      )
    ) {
      return;
    }
    candidates.push(candidate);
  };

  const hasTemporalTriggerInCurrentTurn = async (
    triggerId: string,
    participantId: string,
  ) => {
    const existing = await prisma.mahaLilahIntervention.findFirst({
      where: {
        roomId: room.id,
        participantId,
        triggerId,
        createdAt: { gte: turnStartedAt },
      },
      select: { id: true },
    });
    return Boolean(existing);
  };

  const inactivitySoftConfig = pickEnabledConfig("turn_idle_soft");
  const inactivityHardConfig = pickEnabledConfig("turn_idle_hard");
  if (inactivityHardConfig) {
    const hardThresholdSeconds = Math.max(
      1,
      inactivityHardConfig.thresholds.inactivitySeconds ||
        Math.floor(
          Math.max(1, inactivityHardConfig.thresholds.inactivityMinutes || 0) * 60,
        ),
    );
    if (
      elapsedSeconds >= hardThresholdSeconds &&
      !(await hasTemporalTriggerInCurrentTurn(
        inactivityHardConfig.triggerId,
        activeTurnParticipant.id,
      ))
    ) {
      registerCandidate({
        participantId: activeTurnParticipant.id,
        triggerId: inactivityHardConfig.triggerId,
        triggerLabel: inactivityHardConfig.title,
        severity: inactivityHardConfig.severity,
        turnNumber: getLatestTurn(activeTurnParticipant.id),
        moveId: null,
        triggerData: {
          inactivitySeconds: elapsedSeconds,
          inactivityMinutes: elapsedMinutes,
          turnStartedAt: turnStartedAt.toISOString(),
        },
        fallbackTitle: "Pausa longa no turno ativo",
        fallbackMessage: `O turno ativo está sem rolagem há ${elapsedSeconds} segundos.`,
        fallbackReflectionQuestion:
          "Qual resistência ou distração está ocupando o espaço desta jogada?",
        fallbackMicroAction:
          "Convide uma respiração consciente e retome o dado com uma intenção curta.",
      });
    }
  }

  if (inactivitySoftConfig) {
    const softThresholdSeconds = Math.max(
      1,
      inactivitySoftConfig.thresholds.inactivitySeconds ||
        Math.floor(
          Math.max(1, inactivitySoftConfig.thresholds.inactivityMinutes || 0) * 60,
        ),
    );
    if (
      elapsedSeconds >= softThresholdSeconds &&
      !(await hasTemporalTriggerInCurrentTurn(
        inactivitySoftConfig.triggerId,
        activeTurnParticipant.id,
      ))
    ) {
      registerCandidate({
        participantId: activeTurnParticipant.id,
        triggerId: inactivitySoftConfig.triggerId,
        triggerLabel: inactivitySoftConfig.title,
        severity: inactivitySoftConfig.severity,
        turnNumber: getLatestTurn(activeTurnParticipant.id),
        moveId: null,
        triggerData: {
          inactivitySeconds: elapsedSeconds,
          inactivityMinutes: elapsedMinutes,
          turnStartedAt: turnStartedAt.toISOString(),
        },
        fallbackTitle: "Inatividade detectada no turno",
        fallbackMessage: `O turno ativo ficou ${elapsedSeconds} segundos sem rolagem.`,
        fallbackReflectionQuestion:
          "O que pode ajudar a retomar o fluxo com presença agora?",
        fallbackMicroAction:
          "Faça um check-in breve e avance para a próxima rolagem.",
      });
    }
  }

  const sessionFatigueConfig = pickEnabledConfig("session_fatigue");
  if (sessionFatigueConfig) {
    const fatigueThreshold = Math.max(
      1,
      sessionFatigueConfig.thresholds.fatigueMoveCount || 40,
    );
    const postStartMovesCount = room.moves.filter((move) => isPostStartMove(move)).length;
    if (postStartMovesCount >= fatigueThreshold) {
      registerCandidate({
        participantId: activeTurnParticipant.id,
        triggerId: sessionFatigueConfig.triggerId,
        triggerLabel: sessionFatigueConfig.title,
        severity: sessionFatigueConfig.severity,
        turnNumber: getLatestTurn(activeTurnParticipant.id),
        moveId: null,
        triggerData: {
          movesInSession: postStartMovesCount,
          fatigueThreshold,
        },
        fallbackTitle: "Fadiga de sessão detectada",
        fallbackMessage: `A sessão já alcançou ${postStartMovesCount} jogadas.`,
        fallbackReflectionQuestion:
          "Vale uma micro pausa para recuperar foco terapêutico antes de continuar?",
        fallbackMicroAction:
          "Defina uma pausa curta de regulação e retome em seguida.",
      });
    }
  }

  const therapistSilenceConfig = pickEnabledConfig("therapist_silence");
  if (therapistSilenceConfig && room.therapistPlays) {
    const therapistParticipants = room.participants.filter(
      (participant) => participant.role === "THERAPIST",
    );
    const therapistUserIds = therapistParticipants.map(
      (participant) => participant.userId,
    );
    if (therapistParticipants.length > 0 && therapistUserIds.length > 0) {
      const [lastApproval, lastDismissal, lastFeedback] = await Promise.all([
        prisma.mahaLilahIntervention.findFirst({
          where: {
            roomId: room.id,
            approvedByUserId: { in: therapistUserIds },
            approvedAt: { not: null },
          },
          orderBy: { approvedAt: "desc" },
          select: { approvedAt: true },
        }),
        prisma.mahaLilahIntervention.findFirst({
          where: {
            roomId: room.id,
            dismissedByUserId: { in: therapistUserIds },
            dismissedAt: { not: null },
          },
          orderBy: { dismissedAt: "desc" },
          select: { dismissedAt: true },
        }),
        prisma.mahaLilahInterventionFeedback.findFirst({
          where: {
            roomId: room.id,
            userId: { in: therapistUserIds },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      const actionDates = [
        lastApproval?.approvedAt || null,
        lastDismissal?.dismissedAt || null,
        lastFeedback?.createdAt || null,
      ]
        .filter((value): value is Date => Boolean(value))
        .map((value) => new Date(value).getTime());
      const lastTherapistActionAt =
        actionDates.length > 0 ? new Date(Math.max(...actionDates)) : null;

      const playerParticipantIds = new Set(
        room.participants
          .filter((participant) => participant.role === "PLAYER")
          .map((participant) => participant.id),
      );
      const playerMovesSinceLastAction = room.moves.filter((move) => {
        if (!playerParticipantIds.has(move.participantId)) return false;
        if (!lastTherapistActionAt) return true;
        return new Date(move.createdAt).getTime() > lastTherapistActionAt.getTime();
      }).length;
      const silenceThreshold = Math.max(
        1,
        therapistSilenceConfig.thresholds.therapistSilenceMoves || 8,
      );

      if (playerMovesSinceLastAction >= silenceThreshold) {
        const therapistTarget = therapistParticipants[0];
        registerCandidate({
          participantId: therapistTarget.id,
          triggerId: therapistSilenceConfig.triggerId,
          triggerLabel: therapistSilenceConfig.title,
          severity: therapistSilenceConfig.severity,
          turnNumber: getLatestTurn(therapistTarget.id),
          moveId: null,
          visibleTo: "THERAPIST_ONLY",
          triggerData: {
            therapistSilenceMoves: silenceThreshold,
            playerMovesSinceLastAction,
            lastTherapistActionAt: lastTherapistActionAt
              ? lastTherapistActionAt.toISOString()
              : null,
          },
          fallbackTitle: "Silêncio terapêutico prolongado",
          fallbackMessage: `Foram ${playerMovesSinceLastAction} jogadas de jogadores sem intervenção registrada do terapeuta.`,
          fallbackReflectionQuestion:
            "Qual intervenção breve pode recolocar direção e segurança clínica neste momento?",
          fallbackMicroAction:
            "Escolha um foco terapêutico objetivo para a próxima rodada.",
        });
      }
    }
  }

  if (candidates.length === 0) return [];

  const severityPriority: Record<InterventionSeverity, number> = {
    CRITICAL: 3,
    ATTENTION: 2,
    INFO: 1,
  };
  candidates.sort((a, b) => {
    const aPriority = severityPriority[a.severity] || 0;
    const bPriority = severityPriority[b.severity] || 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return (b.turnNumber || 0) - (a.turnNumber || 0);
  });

  const limitConfig = await getRoomAiLimits({
    id: room.id,
    planType: room.planType,
    orderId: room.orderId,
    isTrial: room.isTrial,
    subscriptionId: room.subscriptionId,
    createdByUserId: room.createdByUserId,
  });
  const interventionsLimit = Math.max(
    0,
    Number(limitConfig.interventionLimitPerParticipant || 0),
  );
  if (interventionsLimit <= 0) return [];

  const uniqueParticipantIds = Array.from(
    new Set(candidates.map((candidate) => candidate.participantId)),
  );
  const usedByParticipant = new Map<string, number>();
  await Promise.all(
    uniqueParticipantIds.map(async (participantId) => {
      const usedCount = await prisma.mahaLilahIntervention.count({
        where: {
          roomId: room.id,
          participantId,
        },
      });
      usedByParticipant.set(participantId, usedCount);
    }),
  );

  const createdInterventions: Array<{
    id: string;
    participantId: string;
    status: InterventionStatus;
    triggerId: string;
    title: string;
  }> = [];

  for (const candidate of candidates) {
    const usedForParticipant = usedByParticipant.get(candidate.participantId) || 0;
    if (usedForParticipant >= interventionsLimit) continue;

    const config = configsByTrigger.get(candidate.triggerId);
    if (!config || !config.enabled) continue;

    const created = await createInterventionFromCandidate({
      room: {
        id: room.id,
        therapistSoloPlay: room.therapistSoloPlay,
        therapistPlays: room.therapistPlays,
      },
      roomParticipants: room.participants,
      participantId: candidate.participantId,
      candidate,
      config,
    });
    if (!created) continue;

    usedByParticipant.set(candidate.participantId, usedForParticipant + 1);
    createdInterventions.push({
      id: created.id,
      participantId: created.participantId,
      status: created.status as InterventionStatus,
      triggerId: created.triggerId,
      title: created.title,
    });
  }

  return createdInterventions;
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

  const latestMovesByParticipantEntries = await Promise.all(
    room.participants.map(async (participant) => {
      const latestMove = await prisma.mahaLilahMove.findFirst({
        where: {
          roomId: room.id,
          participantId: participant.id,
        },
        orderBy: [{ turnNumber: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          turnNumber: true,
          diceValue: true,
          toPos: true,
        },
      });
      return [participant.id, latestMove] as const;
    }),
  );
  const latestMovesByParticipant = new Map(latestMovesByParticipantEntries);

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
      therapistPlays: room.therapistPlays,
      playerIntentionLocked: room.playerIntentionLocked,
      therapistSoloPlay: room.therapistSoloPlay,
      aiReportsCount: room._count.aiReports,
      currentTurnIndex: safeTurnIndex,
      turnParticipantId,
      therapistOnline,
    },
    participants: room.participants.map((p) => ({
      id: p.id,
      role: p.role,
      user: p.user,
      online: hasParticipantOnline(room.id, p.userId),
      lastMoveId: latestMovesByParticipant.get(p.id)?.id || null,
      lastMoveTurnNumber:
        latestMovesByParticipant.get(p.id)?.turnNumber ?? null,
      lastMoveDiceValue:
        latestMovesByParticipant.get(p.id)?.diceValue ?? null,
      lastMoveToPos: latestMovesByParticipant.get(p.id)?.toPos ?? null,
      consentAcceptedAt: p.consentAcceptedAt,
      gameIntention: p.gameIntention,
      therapistSummary: p.therapistSummary,
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

    const participantTurnStats = await tx.mahaLilahMove.aggregate({
      where: {
        roomId: room.id,
        participantId: currentParticipant.id,
      },
      _max: {
        turnNumber: true,
      },
    });
    const nextParticipantTurnNumber =
      (participantTurnStats._max.turnNumber ?? 0) + 1;

    const createdMove = await tx.mahaLilahMove.create({
      data: {
        roomId: room.id,
        turnNumber: nextParticipantTurnNumber,
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
        moveId: createdMove.id,
        movedTurnNumber: createdMove.turnNumber,
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
      update: {
        currentTurnIndex: nextTurnIndex,
        turnStartedAt: new Date(),
      },
      create: {
        roomId: room.id,
        currentTurnIndex: nextTurnIndex,
        turnStartedAt: new Date(),
      },
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
      moveId: createdMove.id,
      movedTurnNumber: createdMove.turnNumber,
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
      update: {
        currentTurnIndex: nextTurnIndex,
        turnStartedAt: new Date(),
      },
      create: {
        roomId: room.id,
        currentTurnIndex: nextTurnIndex,
        turnStartedAt: new Date(),
      },
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

const temporalScanTimer = setInterval(() => {
  void scanTemporalInterventionsForActiveRooms();
}, INTERVENTION_TEMPORAL_SCAN_MS);
if (typeof temporalScanTimer.unref === "function") {
  temporalScanTimer.unref();
}

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
    async (
      payload: {
        code: string;
        forceTakeover?: boolean;
        adminOpenToken?: string;
      },
      callback?: (payload: any) => void,
    ) => {
      try {
        const code = payload?.code;
        const forceTakeover = Boolean(payload?.forceTakeover);
        const adminOpenToken =
          typeof payload?.adminOpenToken === "string"
            ? payload.adminOpenToken
            : null;
        if (!code) throw new Error("Código da sala não informado");
        const currentUser = socket.data.user;
        if (!currentUser) throw new Error("Usuário não autenticado");
        const userId = currentUser.id;
        const isAdminUser = currentUser.role === "ADMIN";
        const previousRoomId = socket.data.roomId || null;
        const room = await prisma.mahaLilahRoom.findUnique({ where: { code } });
        if (!room) throw new Error("Sala não encontrada");
        const hasAdminOpenAccess = await hasValidAdminOpenToken({
          token: adminOpenToken,
          roomId: room.id,
          roomCode: room.code,
        });

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: room.id, userId },
        });
        if (!participant && !isAdminUser && !hasAdminOpenAccess) {
          throw new Error("Sem acesso à sala");
        }
        const roomState = await buildRoomState(room.id);
        if (!roomState) throw new Error("Sala não encontrada");
        if (
          roomState.room.status !== "ACTIVE" &&
          !isAdminUser &&
          !hasAdminOpenAccess
        ) {
          throw buildSocketError(
            "Sala já foi encerrada e não pode mais ser aberta.",
            "ROOM_CLOSED",
          );
        }

        let claimed = await claimUserActiveSession(userId, room.id, socket.id);
        let forcedClaim: ForceClaimUserSessionResult | null = null;

        if (!claimed.ok && forceTakeover) {
          forcedClaim = await forceClaimUserActiveSession(
            userId,
            room.id,
            socket.id,
          );
          claimed = { ok: true };
        }

        if (!claimed.ok) {
          const sameRoom = claimed.existingRoomId === room.id;
          throw buildSocketError(
            sameRoom
              ? "Você já está conectado nesta sala em outra aba/dispositivo."
              : "Você já está conectado em outra sala. Feche a sessão ativa antes de entrar em uma nova sala.",
            "CONCURRENT_ROOM_SESSION",
          );
        }

        if (
          forcedClaim?.replacedSocketId &&
          forcedClaim.replacedSocketId !== socket.id
        ) {
          const replacedSocket = io.sockets.sockets.get(
            forcedClaim.replacedSocketId,
          );
          if (replacedSocket) {
            replacedSocket.emit("session:terminated", {
              code: "FORCED_TAKEOVER",
              message:
                "Sua sessão foi encerrada porque esta conta entrou na sala em outro dispositivo.",
            });
            setTimeout(() => {
              replacedSocket.disconnect(true);
            }, 50);
          }
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

          const refreshedState = await buildRoomState(room.id);
          if (!refreshedState) throw new Error("Sala não encontrada");
          callback?.({ ok: true, state: refreshedState });
          io.to(room.id).emit("room:state", refreshedState);
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
            const participantId = result.movedParticipantId;
            if (typeof result?.moveId === "string") {
              try {
                const createdInterventions = await evaluateInterventionsAfterMove({
                  roomId,
                  participantId,
                  moveId: result.moveId,
                });
                const temporalInterventions =
                  await evaluateTemporalInterventionsForRoom({
                    roomId,
                  });
                const combinedInterventions = [
                  ...createdInterventions,
                  ...temporalInterventions,
                ];
                if (combinedInterventions.length > 0) {
                  io.to(roomId).emit("intervention:generated", {
                    roomId,
                    participantId,
                    interventions: combinedInterventions.map((item) => ({
                      id: item.id,
                      participantId: item.participantId,
                      status: item.status,
                      triggerId: item.triggerId,
                      title: item.title,
                    })),
                    pendingApprovals: combinedInterventions.filter(
                      (item) => item.status === "PENDING_APPROVAL",
                    ).length,
                  });
                }
              } catch (interventionError) {
                console.error(
                  "Erro ao processar intervenções automáticas:",
                  interventionError,
                );
              }
            }

            try {
              const generated = await generateProgressSummaryIfNeeded({
                roomId,
                participantId,
                onStatusChange: ({
                  status,
                  participantId: targetParticipantId,
                  participantName,
                  windowStartMoveIndex,
                  windowEndMoveIndex,
                }) => {
                  io.to(roomId).emit("ai:progressSummaryStatus", {
                    status,
                    participantId: targetParticipantId,
                    participantName,
                    windowStartMoveIndex,
                    windowEndMoveIndex,
                  });
                },
              });
              if (!generated.created) return;
              const refreshedState = await buildRoomState(roomId);
              if (refreshedState) {
                io.to(roomId).emit("room:state", refreshedState);
              }
            } catch (progressError) {
              io.to(roomId).emit("ai:progressSummaryStatus", {
                status: "error",
                participantId,
              });
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
      {
        moveId,
        participantId,
      }: { moveId?: string; participantId?: string },
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

        const requesterParticipant = room.participants.find(
          (p) => p.userId === socket.data.user?.id,
        );
        if (!requesterParticipant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requesterParticipant);
        ensureNotViewerInTherapistSoloMode(room, requesterParticipant);

        const targetParticipant = requesterParticipant;
        if (
          typeof participantId === "string" &&
          participantId.trim() &&
          participantId !== requesterParticipant.id
        ) {
          throw new Error(
            "Cada participante só pode tirar carta para si mesmo.",
          );
        }

        let move = null as Awaited<
          ReturnType<typeof prisma.mahaLilahMove.findUnique>
        > | null;
        if (moveId) {
          move = await prisma.mahaLilahMove.findUnique({
            where: { id: moveId },
          });
        } else {
          move = await prisma.mahaLilahMove.findFirst({
            where: {
              roomId: room.id,
              participantId: targetParticipant.id,
            },
            orderBy: [{ turnNumber: "desc" }, { createdAt: "desc" }],
          });
        }

        if (!move || move.roomId !== room.id) {
          throw new Error("Este participante ainda não fez jogada para tirar carta.");
        }
        if (move.participantId !== targetParticipant.id) {
          throw new Error("Jogada não pertence ao participante selecionado.");
        }

        const existingDraws = await prisma.mahaLilahCardDraw.findMany({
          where: {
            roomId: room.id,
            moveId: move.id,
            drawnByParticipantId: targetParticipant.id,
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
            drawnByParticipantId: targetParticipant.id,
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
          participantId: targetParticipant.id,
          moveId: move.id,
          moveTurnNumber: move.turnNumber,
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
          select: { status: true, therapistSoloPlay: true },
        });
        if (!room) throw new Error("Sala não encontrada");
        if (room.status !== "ACTIVE") throw new Error("Sala não está ativa");
        ensureNotViewerInTherapistSoloMode(room, participant);

        let move = null as Awaited<
          ReturnType<typeof prisma.mahaLilahMove.findUnique>
        > | null;

        if (moveId) {
          move = await prisma.mahaLilahMove.findUnique({
            where: { id: moveId },
          });
        } else {
          move = await prisma.mahaLilahMove.findFirst({
            where: {
              roomId: socket.data.roomId,
              participantId: participant.id,
            },
            orderBy: [{ turnNumber: "desc" }, { createdAt: "desc" }],
          });
        }

        if (!move || move.roomId !== socket.data.roomId) {
          throw new Error("Você ainda não tem jogadas para registrar.");
        }
        if (move.participantId !== participant.id) {
          throw new Error("Registro permitido apenas para a própria jogada");
        }

        await prisma.mahaLilahTherapyEntry.create({
          data: {
            roomId: socket.data.roomId,
            moveId: move.id,
            participantId: participant.id,
            emotion: emotion || null,
            intensity: typeof intensity === "number" ? intensity : null,
            insight: insight || null,
            body: body || null,
            microAction: microAction || null,
          },
        });

        const [moveInterventions, temporalInterventions] = await Promise.all([
          evaluateInterventionsAfterMove({
            roomId: socket.data.roomId,
            participantId: participant.id,
            moveId: move.id,
          }).catch((error) => {
            console.error(
              "Erro ao avaliar intervenções após registro terapêutico:",
              error,
            );
            return [];
          }),
          evaluateTemporalInterventionsForRoom({
            roomId: socket.data.roomId,
          }).catch((error) => {
            console.error(
              "Erro ao avaliar intervenções temporais após registro terapêutico:",
              error,
            );
            return [];
          }),
        ]);
        const combinedInterventions = [...moveInterventions, ...temporalInterventions];
        if (combinedInterventions.length > 0) {
          io.to(socket.data.roomId).emit("intervention:generated", {
            roomId: socket.data.roomId,
            participantId: participant.id,
            interventions: combinedInterventions.map((item) => ({
              id: item.id,
              participantId: item.participantId,
              status: item.status,
              triggerId: item.triggerId,
              title: item.title,
            })),
            pendingApprovals: combinedInterventions.filter(
              (item) => item.status === "PENDING_APPROVAL",
            ).length,
          });
        }

        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({
          ok: true,
          moveId: move.id,
          moveTurnNumber: move.turnNumber,
          diceValue: move.diceValue,
        });
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
        const roomId = socket.data.roomId;
        enforceCooldown(
          `participant-intention:${socket.data.user.id}:${roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: roomId },
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

        const shouldReplicateTherapistIntentionInSoloPlay = Boolean(
          participant.role === "THERAPIST" && room.therapistSoloPlay,
        );

        let replicatedPlayersCount = 0;

        if (shouldReplicateTherapistIntentionInSoloPlay) {
          replicatedPlayersCount = await prisma.$transaction(async (tx) => {
            await tx.mahaLilahParticipant.update({
              where: { id: participant.id },
              data: { gameIntention: normalizedIntention || null },
            });

            const updatedPlayers = await tx.mahaLilahParticipant.updateMany({
              where: {
                roomId,
                role: "PLAYER",
              },
              data: { gameIntention: normalizedIntention || null },
            });

            return updatedPlayers.count;
          });
        } else {
          await prisma.mahaLilahParticipant.update({
            where: { id: participant.id },
            data: { gameIntention: normalizedIntention || null },
          });
        }

        const state = await buildRoomState(roomId);
        if (state) io.to(roomId).emit("room:state", state);
        callback?.({
          ok: true,
          intention: normalizedIntention || null,
          replicatedToPlayers: shouldReplicateTherapistIntentionInSoloPlay,
          updatedPlayers: shouldReplicateTherapistIntentionInSoloPlay
            ? replicatedPlayersCount
            : 0,
        });
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
      payload: {
        mode?: "currentHouse" | "pathQuestion";
        question?: string;
      } = {},
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
        const lastMove = await prisma.mahaLilahMove.findFirst({
          where: { roomId: room.id, participantId: participant.id },
          orderBy: [{ turnNumber: "desc" }, { createdAt: "desc" }],
          select: { turnNumber: true, toPos: true },
        });
        if (!lastMove) {
          throw new Error("Faça ao menos uma jogada antes de pedir ajuda da IA.");
        }

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

        const tipMode =
          payload?.mode === "pathQuestion" ? "pathQuestion" : "currentHouse";
        const normalizedQuestion =
          typeof payload?.question === "string"
            ? payload.question.trim().slice(0, AI_TIP_QUESTION_MAX_LENGTH)
            : "";
        if (tipMode === "pathQuestion" && !normalizedQuestion) {
          throw new Error("Escreva um contexto para pedir ajuda pelo caminho.");
        }

        const participantIntention = participant.gameIntention?.trim() || null;
        const context = await buildAiContext(room.id, participant.id);
        const prompt = buildAiTipPrompt({
          context,
          participantIntention,
          mode: tipMode,
          question: normalizedQuestion || null,
        });

        const content = await callOpenAI(prompt);
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
              mode: tipMode,
              question: tipMode === "pathQuestion" ? normalizedQuestion : null,
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
          mode: tipMode,
          question: tipMode === "pathQuestion" ? normalizedQuestion : null,
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

        const turnParticipants = getTurnParticipants(
          room.participants,
          room.therapistPlays,
          room.therapistSoloPlay,
        );
        let participantIds = Array.from(
          new Set(turnParticipants.map((participant) => participant.id)),
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
    "intervention:approve",
    async (
      { interventionId }: { interventionId?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId) {
          throw new Error("Sala não selecionada");
        }
        if (!interventionId || !interventionId.trim()) {
          throw new Error("Intervenção não informada");
        }

        enforceCooldown(
          `intervention-approve:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const requester = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!requester) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requester);
        if (requester.role !== "THERAPIST") {
          throw new Error("Apenas o terapeuta pode aprovar intervenções.");
        }

        const intervention = await prisma.mahaLilahIntervention.findUnique({
          where: { id: interventionId },
          select: {
            id: true,
            roomId: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });

        if (!intervention || intervention.roomId !== room.id) {
          throw new Error("Intervenção não encontrada nesta sala.");
        }
        if (intervention.status !== "PENDING_APPROVAL") {
          throw new Error("Esta intervenção já foi tratada.");
        }

        const updated = await prisma.mahaLilahIntervention.update({
          where: { id: intervention.id },
          data: {
            status: "APPROVED",
            visibleTo: "ROOM",
            snoozedUntil: null,
            approvedAt: new Date(),
            approvedByUserId: socket.data.user.id,
            dismissedAt: null,
            dismissedByUserId: null,
          },
          select: {
            id: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });

        io.to(room.id).emit("intervention:updated", {
          roomId: room.id,
          intervention: updated,
          action: "APPROVE",
        });
        callback?.({ ok: true, intervention: updated });
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error?.message || "Não foi possível aprovar a intervenção.",
        });
      }
    },
  );

  socket.on(
    "intervention:dismiss",
    async (
      {
        interventionId,
        muteSession,
      }: { interventionId?: string; muteSession?: boolean } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId) {
          throw new Error("Sala não selecionada");
        }
        if (!interventionId || !interventionId.trim()) {
          throw new Error("Intervenção não informada");
        }

        enforceCooldown(
          `intervention-dismiss:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const requester = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!requester) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requester);
        if (requester.role !== "THERAPIST") {
          throw new Error("Apenas o terapeuta pode dispensar intervenções.");
        }

        const intervention = await prisma.mahaLilahIntervention.findUnique({
          where: { id: interventionId },
          select: {
            id: true,
            roomId: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });

        if (!intervention || intervention.roomId !== room.id) {
          throw new Error("Intervenção não encontrada nesta sala.");
        }
        if (intervention.status !== "PENDING_APPROVAL") {
          throw new Error("Esta intervenção já foi tratada.");
        }

        const updated = await prisma.mahaLilahIntervention.update({
          where: { id: intervention.id },
          data: {
            status: "DISMISSED",
            visibleTo: "THERAPIST_ONLY",
            snoozedUntil: null,
            dismissedAt: new Date(),
            dismissedByUserId: socket.data.user.id,
            approvedAt: null,
            approvedByUserId: null,
          },
          select: {
            id: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });

        if (muteSession) {
          await prisma.mahaLilahInterventionFeedback.create({
            data: {
              interventionId: intervention.id,
              roomId: room.id,
              participantId: intervention.participantId,
              triggerId: intervention.triggerId,
              userId: socket.data.user.id,
              action: "DISMISSED",
              note: INTERVENTION_MUTE_SESSION_NOTE,
              metadata: {
                source: "therapist-dismiss",
              } as any,
            },
          });
        }

        io.to(room.id).emit("intervention:updated", {
          roomId: room.id,
          intervention: updated,
          action: "DISMISS",
        });
        callback?.({ ok: true, intervention: updated });
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error?.message || "Não foi possível dispensar a intervenção.",
        });
      }
    },
  );

  socket.on(
    "intervention:snooze",
    async (
      { interventionId }: { interventionId?: string } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId) {
          throw new Error("Sala não selecionada");
        }
        if (!interventionId || !interventionId.trim()) {
          throw new Error("Intervenção não informada");
        }

        enforceCooldown(
          `intervention-snooze:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const requester = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!requester) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requester);
        if (requester.role !== "THERAPIST") {
          throw new Error("Apenas o terapeuta pode adiar intervenções.");
        }

        const intervention = await prisma.mahaLilahIntervention.findUnique({
          where: { id: interventionId },
          select: {
            id: true,
            roomId: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });
        if (!intervention || intervention.roomId !== room.id) {
          throw new Error("Intervenção não encontrada nesta sala.");
        }

        const snoozedUntil = new Date(
          Date.now() + INTERVENTION_SNOOZE_MINUTES * 60_000,
        );
        const updated = await prisma.mahaLilahIntervention.update({
          where: { id: intervention.id },
          data: {
            status: "SNOOZED",
            visibleTo: "THERAPIST_ONLY",
            snoozedUntil,
          },
          select: {
            id: true,
            participantId: true,
            status: true,
            triggerId: true,
            title: true,
          },
        });

        io.to(room.id).emit("intervention:updated", {
          roomId: room.id,
          intervention: updated,
          action: "SNOOZE",
        });
        callback?.({
          ok: true,
          intervention: updated,
          snoozedUntil: snoozedUntil.toISOString(),
        });
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error?.message || "Não foi possível adiar a intervenção.",
        });
      }
    },
  );

  socket.on(
    "intervention:feedback",
    async (
      {
        interventionId,
        action,
        note,
      }: {
        interventionId?: string;
        action?: InterventionFeedbackAction;
        note?: string;
      } = {},
      callback?: (payload: any) => void,
    ) => {
      try {
        if (!socket.data.user || !socket.data.roomId) {
          throw new Error("Sala não selecionada");
        }
        if (!interventionId || !interventionId.trim()) {
          throw new Error("Intervenção não informada");
        }
        if (
          action !== "HELPFUL" &&
          action !== "NOT_HELPFUL" &&
          action !== "APPLIED" &&
          action !== "DISMISSED"
        ) {
          throw new Error("Ação de feedback inválida");
        }

        enforceCooldown(
          `intervention-feedback:${socket.data.user.id}:${socket.data.roomId}`,
          THERAPY_COOLDOWN_MS,
        );

        const room = await prisma.mahaLilahRoom.findUnique({
          where: { id: socket.data.roomId },
          include: { participants: true },
        });
        if (!room) throw new Error("Sala não encontrada");

        const requester = room.participants.find(
          (participant) => participant.userId === socket.data.user?.id,
        );
        if (!requester) throw new Error("Participante não encontrado");
        ensureConsentAccepted(requester);

        const intervention = await prisma.mahaLilahIntervention.findUnique({
          where: { id: interventionId },
          select: {
            id: true,
            roomId: true,
            participantId: true,
            triggerId: true,
            visibleTo: true,
          },
        });
        if (!intervention || intervention.roomId !== room.id) {
          throw new Error("Intervenção não encontrada nesta sala.");
        }
        if (
          intervention.visibleTo === "THERAPIST_ONLY" &&
          requester.role !== "THERAPIST"
        ) {
          throw new Error("Somente o terapeuta pode avaliar esta intervenção.");
        }

        const feedback = await prisma.mahaLilahInterventionFeedback.create({
          data: {
            interventionId: intervention.id,
            roomId: room.id,
            participantId: intervention.participantId,
            triggerId: intervention.triggerId,
            userId: socket.data.user.id,
            action,
            note: note?.trim() || null,
          },
          select: {
            id: true,
            action: true,
            note: true,
            createdAt: true,
            interventionId: true,
          },
        });

        callback?.({ ok: true, feedback });
      } catch (error: any) {
        callback?.({
          ok: false,
          error: error?.message || "Não foi possível registrar o feedback.",
        });
      }
    },
  );

  socket.on(
    "game:nextTurn",
    async (_payload: any, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: socket.data.roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
        await advanceTurnInRoom(socket.data.roomId, socket.data.user.id);
        const temporalInterventions = await evaluateTemporalInterventionsForRoom({
          roomId: socket.data.roomId,
        });
        if (temporalInterventions.length > 0) {
          io.to(socket.data.roomId).emit("intervention:generated", {
            roomId: socket.data.roomId,
            participantId: null,
            interventions: temporalInterventions.map((item) => ({
              id: item.id,
              participantId: item.participantId,
              status: item.status,
              triggerId: item.triggerId,
              title: item.title,
            })),
            pendingApprovals: temporalInterventions.filter(
              (item) => item.status === "PENDING_APPROVAL",
            ).length,
          });
        }
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
        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: socket.data.roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);
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
