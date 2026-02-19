import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";
import Redis from "ioredis";
import { randomBytes } from "crypto";

interface RouteParams {
  params: { roomId: string };
}

const ADMIN_OPEN_TOKEN_TTL_SECONDS = Number(
  process.env.MAHALILAH_ADMIN_OPEN_TOKEN_TTL_SECONDS || 600,
);
const ADMIN_OPEN_TOKEN_KEY_PREFIX = "mahalilah:admin-open-token";
const DEFAULT_DEV_REDIS_URL = "redis://localhost:6379";

const redisGlobal = globalThis as unknown as {
  __mahalilahAdminOpenRedis?: Redis | null;
};

function getMahaLilahBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_MAHALILAH_URL ||
    process.env.NEXTAUTH_URL_MAHALILAH ||
    "https://mahalilahonline.com.br"
  );
}

function getRedisClient() {
  if (redisGlobal.__mahalilahAdminOpenRedis !== undefined) {
    return redisGlobal.__mahalilahAdminOpenRedis;
  }

  const redisUrl =
    process.env.REDIS_URL ||
    (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_REDIS_URL : undefined);

  if (!redisUrl) {
    redisGlobal.__mahalilahAdminOpenRedis = null;
    return null;
  }

  redisGlobal.__mahalilahAdminOpenRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (attempt) => Math.min(attempt * 100, 2000),
    reconnectOnError: () => true,
  });

  return redisGlobal.__mahalilahAdminOpenRedis;
}

function createAdminOpenToken() {
  return randomBytes(24).toString("base64url");
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis não configurado para abrir sala via dashboard admin" },
        { status: 500 },
      );
    }

    const adminOpenToken = createAdminOpenToken();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    await redis.set(
      `${ADMIN_OPEN_TOKEN_KEY_PREFIX}:${adminOpenToken}`,
      JSON.stringify({
        scope: "mahalilah_admin_room_open",
        roomId: room.id,
        roomCode: room.code,
        issuedByUserId: session.user.id || null,
      }),
      "EX",
      ADMIN_OPEN_TOKEN_TTL_SECONDS,
    );

    const roomUrl = new URL(`/rooms/${room.code}`, getMahaLilahBaseUrl());
    roomUrl.searchParams.set("adminOpenToken", adminOpenToken);

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
      },
      roomUrl: roomUrl.toString(),
    });
  } catch (error) {
    console.error("Erro ao abrir sala Maha Lilah (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
