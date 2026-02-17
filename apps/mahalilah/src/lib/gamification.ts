import { prisma } from "@hekate/database";

type MahaGamificationPointSettings = {
  roomPurchasePoints: number;
  subscriptionSignupPoints: number;
  subscriptionRenewalPoints: number;
};

const MAHA_POINT_KEYS = {
  roomPurchasePoints: "GAMIFICATION_MAHALILAH_ROOM_PURCHASE_POINTS",
  subscriptionSignupPoints: "GAMIFICATION_MAHALILAH_SUBSCRIPTION_SIGNUP_POINTS",
  subscriptionRenewalPoints: "GAMIFICATION_MAHALILAH_SUBSCRIPTION_RENEWAL_POINTS",
} as const;

const MAHA_POINT_DEFAULTS: MahaGamificationPointSettings = {
  roomPurchasePoints: 120,
  subscriptionSignupPoints: 200,
  subscriptionRenewalPoints: 80,
};

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function calculateLevel(points: number): number {
  return Math.floor(Math.sqrt(points / 100)) + 1;
}

function getPointsToNextLevel(currentLevel: number): number {
  const nextLevel = currentLevel + 1;
  const pointsForNextLevel = Math.pow(nextLevel - 1, 2) * 100;
  const pointsForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
  return pointsForNextLevel - pointsForCurrentLevel;
}

export async function getMahaGamificationPointSettings(): Promise<MahaGamificationPointSettings> {
  const keys = Object.values(MAHA_POINT_KEYS);
  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });

  const byKey = new Map(settings.map((entry) => [entry.key, entry.value]));

  return {
    roomPurchasePoints: toNumber(
      byKey.get(MAHA_POINT_KEYS.roomPurchasePoints),
      MAHA_POINT_DEFAULTS.roomPurchasePoints,
    ),
    subscriptionSignupPoints: toNumber(
      byKey.get(MAHA_POINT_KEYS.subscriptionSignupPoints),
      MAHA_POINT_DEFAULTS.subscriptionSignupPoints,
    ),
    subscriptionRenewalPoints: toNumber(
      byKey.get(MAHA_POINT_KEYS.subscriptionRenewalPoints),
      MAHA_POINT_DEFAULTS.subscriptionRenewalPoints,
    ),
  };
}

export async function awardMahaGamificationPoints(params: {
  userId: string;
  points: number;
  uniqueKey: string;
  eventType: string;
  reasonLabel: string;
  metadata?: Record<string, unknown>;
}) {
  if (!params.userId || params.points <= 0) return { awarded: false as const };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.pointTransaction.findFirst({
      where: {
        userId: params.userId,
        metadata: {
          path: ["uniqueKey"],
          equals: params.uniqueKey,
        },
      },
      select: { id: true },
    });

    if (existing) return { awarded: false as const };

    const userPoints = await tx.userPoints.upsert({
      where: { userId: params.userId },
      update: {
        totalPoints: {
          increment: params.points,
        },
      },
      create: {
        userId: params.userId,
        totalPoints: params.points,
        currentLevel: 1,
        pointsToNext: 100,
      },
    });

    const newLevel = calculateLevel(userPoints.totalPoints);
    if (newLevel > userPoints.currentLevel) {
      await tx.userPoints.update({
        where: { userId: params.userId },
        data: {
          currentLevel: newLevel,
          pointsToNext: getPointsToNextLevel(newLevel),
        },
      });
    }

    await tx.pointTransaction.create({
      data: {
        userId: params.userId,
        type: "EARNED",
        points: params.points,
        reason: params.reasonLabel,
        description: `Pontos ganhos: ${params.reasonLabel}`,
        metadata: {
          ...(params.metadata || {}),
          uniqueKey: params.uniqueKey,
          eventType: params.eventType,
          source: "mahalilah",
        },
      },
    });

    await tx.leaderboardEntry.upsert({
      where: {
        userId_category_period_periodStart: {
          userId: params.userId,
          category: "POINTS",
          period: "ALL_TIME",
          periodStart: new Date(0),
        },
      },
      update: {
        score: userPoints.totalPoints,
        updatedAt: new Date(),
      },
      create: {
        userId: params.userId,
        category: "POINTS",
        period: "ALL_TIME",
        score: userPoints.totalPoints,
        rank: 0,
        periodStart: new Date(0),
      },
    });

    return { awarded: true as const };
  });
}
