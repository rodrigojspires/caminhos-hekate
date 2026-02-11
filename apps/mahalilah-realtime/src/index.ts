import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
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

const ROLL_COOLDOWN_MS = Number(process.env.MAHALILAH_ROLL_COOLDOWN_MS || 1200);
const AI_COOLDOWN_MS = Number(process.env.MAHALILAH_AI_COOLDOWN_MS || 4000);
const DECK_COOLDOWN_MS = Number(process.env.MAHALILAH_DECK_COOLDOWN_MS || 800);
const THERAPY_COOLDOWN_MS = Number(
  process.env.MAHALILAH_THERAPY_COOLDOWN_MS || 800,
);

const AI_TIPS_LIMITS: Record<string, number> = {
  SINGLE_SESSION: Number(process.env.MAHALILAH_TIPS_SINGLE || 3),
  SUBSCRIPTION: Number(process.env.MAHALILAH_TIPS_SUBSCRIPTION || 5),
  SUBSCRIPTION_LIMITED: Number(
    process.env.MAHALILAH_TIPS_SUBSCRIPTION_LIMITED || 3,
  ),
};

const AI_FINAL_LIMIT = Number(process.env.MAHALILAH_FINAL_LIMIT || 1);

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
            "Você é um terapeuta que usa o jogo Maha Lilah para gerar insights. Responda em português, com estrutura clara e tom acolhedor.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro OpenAI: ${text}`);
  }

  const data = await response.json();
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
    .filter(
      (move) =>
        !(move.fromPos === 68 && move.toPos === 68 && move.diceValue !== 6),
    )
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

function getTipsLimitForPlan(planType: string) {
  return AI_TIPS_LIMITS[planType] ?? AI_TIPS_LIMITS.SINGLE_SESSION;
}

function ensureConsentAccepted(participant: {
  consentAcceptedAt: Date | null;
}) {
  if (!participant.consentAcceptedAt) {
    throw new Error("É necessário aceitar o termo de consentimento");
  }
}

function getTurnParticipants<
  T extends { id: string; role: string; userId: string },
>(participants: T[], therapistPlays: boolean) {
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
  );
  const turnParticipantIds = turnParticipants.map(
    (participant) => participant.id,
  );
  await ensurePlayerStates(room.id, turnParticipantIds);

  let tipsLimit = getTipsLimitForPlan(room.planType);
  const orderMeta = (room.order?.metadata as any)?.mahalilah;
  if (orderMeta?.tipsPerPlayer) {
    const parsedLimit = Number(orderMeta.tipsPerPlayer);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      tipsLimit = parsedLimit;
    }
  }
  const aiUsageByParticipant = new Map(
    room.aiUsages.map((usage) => [usage.participantId, usage]),
  );

  const playerStates = await prisma.mahaLilahPlayerState.findMany({
    where: { roomId: room.id, participantId: { in: turnParticipantIds } },
  });

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
      status: room.status,
      currentTurnIndex: safeTurnIndex,
      turnParticipantId,
      therapistOnline,
    },
    participants: room.participants.map((p) => ({
      id: p.id,
      role: p.role,
      user: p.user,
      consentAcceptedAt: p.consentAcceptedAt,
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
        cards: draw.cards,
        createdAt: draw.createdAt,
        drawnBy: draw.drawnBy,
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

    return { roomId: room.id };
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
  socket.on(
    "room:join",
    async ({ code }: { code: string }, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user) throw new Error("Usuário não autenticado");

        const room = await prisma.mahaLilahRoom.findUnique({ where: { code } });
        if (!room) throw new Error("Sala não encontrada");

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: room.id, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Sem acesso à sala");

        const previousRoomId = socket.data.roomId || null;
        if (previousRoomId) {
          removeRoomConnection(previousRoomId, socket.data.user.id);
          if (previousRoomId !== room.id) {
            socket.leave(previousRoomId);
            const previousState = await buildRoomState(previousRoomId);
            if (previousState)
              io.to(previousRoomId).emit("room:state", previousState);
          }
        }

        socket.join(room.id);
        socket.data.roomId = room.id;
        addRoomConnection(room.id, socket.data.user.id);

        const state = await buildRoomState(room.id);
        if (!state) throw new Error("Sala não encontrada");
        callback?.({ ok: true, state });
        io.to(room.id).emit("room:state", state);
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "game:roll",
    async (_payload: any, callback?: (payload: any) => void) => {
      try {
        if (!socket.data.user || !socket.data.roomId)
          throw new Error("Sala não selecionada");
        enforceCooldown(
          `roll:${socket.data.user.id}:${socket.data.roomId}`,
          ROLL_COOLDOWN_MS,
        );

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: socket.data.roomId, userId: socket.data.user.id },
        });
        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);

        await rollInRoom(socket.data.roomId, socket.data.user.id);
        const state = await buildRoomState(socket.data.roomId);
        if (state) io.to(socket.data.roomId).emit("room:state", state);
        callback?.({ ok: true });
      } catch (error: any) {
        callback?.({ ok: false, error: error.message });
      }
    },
  );

  socket.on(
    "deck:draw",
    async (
      { count, moveId }: { count: number; moveId?: string },
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

        const drawCount = Math.min(Math.max(count || 1, 1), 3);
        const cards = Array.from(
          { length: drawCount },
          () => Math.floor(Math.random() * 72) + 1,
        );
        let safeMoveId: string | null = null;

        if (moveId) {
          const move = await prisma.mahaLilahMove.findUnique({
            where: { id: moveId },
          });
          if (!move || move.roomId !== room.id)
            throw new Error("Jogada inválida");
          if (move.participantId !== participant.id) {
            throw new Error("Jogada não pertence ao participante");
          }
          safeMoveId = move.id;
        }

        await prisma.mahaLilahCardDraw.create({
          data: {
            roomId: room.id,
            moveId: safeMoveId,
            drawnByParticipantId: participant.id,
            cards,
          },
        });

        const state = await buildRoomState(room.id);
        if (state) io.to(room.id).emit("room:state", state);
        callback?.({ ok: true, cards });
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
    "ai:tip",
    async (
      { intention }: { intention?: string } = {},
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

        let tipsLimit = getTipsLimitForPlan(room.planType);
        if (room.orderId) {
          const order = await prisma.order.findUnique({
            where: { id: room.orderId },
          });
          const meta = (order?.metadata as any)?.mahalilah;
          if (meta?.tipsPerPlayer) tipsLimit = Number(meta.tipsPerPlayer);
        }

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

        const context = await buildAiContext(room.id, participant.id);
        const prompt = `Contexto do jogo (JSON):\n${JSON.stringify(context, null, 2)}\n\nIntenção da sessão: ${intention || "não informada"}\n\nGere: perguntas terapêuticas, hipótese de padrão, micro-intervenção corporal e micro-ação. Seja direto e prático.`;

        const content = await callOpenAI(prompt);

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
      { intention }: { intention?: string } = {},
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
        });
        if (!room) throw new Error("Sala não encontrada");

        const participant = await prisma.mahaLilahParticipant.findFirst({
          where: { roomId: room.id, userId: socket.data.user.id },
        });

        if (!participant) throw new Error("Participante não encontrado");
        ensureConsentAccepted(participant);

        let finalLimit = AI_FINAL_LIMIT;
        if (room.orderId) {
          const order = await prisma.order.findUnique({
            where: { id: room.orderId },
          });
          const meta = (order?.metadata as any)?.mahalilah;
          if (meta?.summaryLimit) finalLimit = Number(meta.summaryLimit);
        }

        const existingReports = await prisma.mahaLilahAiReport.count({
          where: { roomId: room.id, participantId: participant.id },
        });

        if (existingReports >= finalLimit) {
          throw new Error("Resumo final já gerado para esta sessão");
        }

        const context = await buildAiContext(room.id, participant.id);
        const prompt = `Contexto do jogo (JSON):\n${JSON.stringify(context, null, 2)}\n\nIntenção da sessão: ${intention || "não informada"}\n\nGere um resumo final estruturado com: padrões, temas, 3 intervenções, plano de 7 dias e perguntas finais.`;

        const content = await callOpenAI(prompt);

        await prisma.mahaLilahAiReport.create({
          data: {
            roomId: room.id,
            participantId: participant.id,
            kind: "FINAL",
            content,
          },
        });

        callback?.({ ok: true, content });
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
    try {
      if (!socket.data.user?.id || !socket.data.roomId) return;
      const roomId = socket.data.roomId;
      removeRoomConnection(roomId, socket.data.user.id);
      const state = await buildRoomState(roomId);
      if (state) io.to(roomId).emit("room:state", state);
    } catch {
      // no-op
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`MahaLilah realtime listening on :${PORT}`);
});
