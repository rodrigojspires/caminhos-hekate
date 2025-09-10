import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';

// Schema para desbloquear conquista
const unlockAchievementSchema = z.object({
  achievementId: z.string().uuid(),
  progress: z.number().min(0).max(100).optional(),
});

// POST /api/gamification/achievements/unlock - Desbloquear conquista
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { achievementId, progress = 100 } = unlockAchievementSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Verificar se a conquista existe
      const achievement = await tx.achievement.findUnique({
        where: { id: achievementId },
        include: { category: true },
      });

      if (!achievement) {
        throw new Error('Achievement not found');
      }

      // Verificar se já foi desbloqueada
      const existingUserAchievement = await tx.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId: session.user.id,
            achievementId,
          },
        },
      });

      if (existingUserAchievement) {
        // Se já existe, apenas atualizar o progresso
        const updatedUserAchievement = await tx.userAchievement.update({
          where: { id: existingUserAchievement.id },
          data: { progress },
          include: {
            achievement: {
              include: { category: true },
            },
          },
        });

        return {
          userAchievement: updatedUserAchievement,
          isNewUnlock: false,
          points: 0,
        };
      }

      // Criar nova conquista desbloqueada
      const userAchievement = await tx.userAchievement.create({
        data: {
          userId: session.user.id,
          achievementId,
          progress,
        },
        include: {
          achievement: {
            include: { category: true },
          },
        },
      });

      let points = 0;

      // Se a conquista foi completamente desbloqueada, adicionar pontos
      if (progress >= 100) {
        // Buscar ou criar pontos do usuário
        let userPoints = await tx.userPoints.findUnique({
          where: { userId: session.user.id },
        });

        if (!userPoints) {
          userPoints = await tx.userPoints.create({
            data: {
              userId: session.user.id,
              totalPoints: 0,
              currentLevel: 1,
              pointsToNext: 100,
            },
          });
        }

        // Adicionar pontos da conquista
        points = achievement.points;
        const newTotalPoints = userPoints.totalPoints + points;
        const newLevel = Math.floor(newTotalPoints / 100) + 1;
        const pointsToNext = (newLevel * 100) - newTotalPoints;

        await tx.userPoints.update({
          where: { userId: session.user.id },
          data: {
            totalPoints: newTotalPoints,
            currentLevel: newLevel,
            pointsToNext: Math.max(0, pointsToNext),
          },
        });

        // Criar transação de pontos
        await tx.pointTransaction.create({
          data: {
            userId: session.user.id,
            points: points,
            type: 'EARNED',
            reason: 'ACHIEVEMENT_UNLOCK',
            description: `Conquista desbloqueada: ${achievement.name}`,
            metadata: {
              achievementId: achievement.id,
              achievementTitle: achievement.name,
            },
          },
        });
      }

      return {
        userAchievement,
        isNewUnlock: true,
        points,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Achievement not found') {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    console.error('Error unlocking achievement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}