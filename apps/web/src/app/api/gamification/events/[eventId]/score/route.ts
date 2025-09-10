import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação do corpo
const UpdateScoreSchema = z.object({
  points: z.number().int().positive(),
  activity: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional()
})

// POST /api/gamification/events/[eventId]/score - Update participant score
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { eventId } = params
    const body = await request.json()
    const { points, activity, metadata } = UpdateScoreSchema.parse(body)

    // Check if event exists and is active
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        eventType: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    const now = new Date()
    if (event.status !== 'ACTIVE' || event.endDate < now || event.startDate > now) {
      return NextResponse.json(
        { error: 'Evento não está ativo' },
        { status: 400 }
      )
    }

    // Check if user is participating
    const participation = await prisma.gamificationEventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      }
    })

    if (!participation || participation.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Você não está participando deste evento' },
        { status: 400 }
      )
    }

    // Update score and recalculate rankings
    const result = await prisma.$transaction(async (tx) => {
      // Update participant score
      const updatedParticipation = await tx.gamificationEventParticipant.update({
        where: {
          eventId_userId: {
            eventId,
            userId: session.user.id
          }
        },
        data: {
          currentScore: {
            increment: points
          }
        }
      })

      // Recalculate rankings for all participants
      const allParticipants = await tx.gamificationEventParticipant.findMany({
        where: {
          eventId,
          status: 'ACTIVE'
        },
        orderBy: [
          { currentScore: 'desc' },
          { enrolledAt: 'asc' }
        ]
      })

      // Update ranks
      for (let i = 0; i < allParticipants.length; i++) {
        await tx.gamificationEventParticipant.update({
          where: {
            id: allParticipants[i].id
          },
          data: {
            currentRank: i + 1
          }
        })
      }

      const newRank = allParticipants.findIndex(p => p.userId === session.user.id) + 1

      return {
        currentScore: updatedParticipation.currentScore,
        newRank
      }
    })

    // Checar conquistas e recompensas após atualização
    await checkEventAchievements(eventId, session.user.id, result.currentScore, result.newRank)

    return NextResponse.json({
      message: 'Pontuação atualizada com sucesso',
      participation: {
        currentScore: result.currentScore,
        currentRank: result.newRank,
        pointsAdded: points
      }
    })
  } catch (error) {
    console.error('Error updating event score:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Helper function to check for achievements and distribute rewards
async function checkEventAchievements(
  eventId: string,
  userId: string,
  currentScore: number,
  currentRank: number
) {
  try {
    // Get event details and total participants
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId },
      include: {
        eventRewards: {
          include: {
            reward: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      }
    })

    if (!event) return

    const totalParticipants = event._count.participants
    const userPercentile = (currentRank / totalParticipants) * 100

    // Check for milestone achievements
    const milestones = [
      { score: 100, name: 'Primeiro Passo', description: 'Alcançou 100 pontos' },
      { score: 500, name: 'Em Ascensão', description: 'Alcançou 500 pontos' },
      { score: 1000, name: 'Competidor', description: 'Alcançou 1000 pontos' },
      { score: 2500, name: 'Especialista', description: 'Alcançou 2500 pontos' },
      { score: 5000, name: 'Mestre', description: 'Alcançou 5000 pontos' }
    ]

    for (const milestone of milestones) {
      if (currentScore >= milestone.score) {
        // Check if user already has this achievement for this event
        const existingAchievement = await prisma.userAchievement.findFirst({
          where: {
            userId,
            achievement: {
              name: milestone.name,
              category: { is: { name: 'EVENT_MILESTONE' } }
            }
          }
        })

        if (!existingAchievement) {
          // Create or find achievement
          let achievement = await prisma.achievement.findFirst({
            where: {
              name: milestone.name,
              category: { is: { name: 'EVENT_MILESTONE' } }
            }
          })

          if (!achievement) {
            achievement = await prisma.achievement.create({
              data: {
                name: milestone.name,
                description: milestone.description,
                category: {
                  connectOrCreate: {
                    where: { name: 'EVENT_MILESTONE' },
                    create: { name: 'EVENT_MILESTONE' }
                  }
                },
                rarity: milestone.score >= 2500 ? 'LEGENDARY' : 
                        milestone.score >= 1000 ? 'EPIC' : 
                        milestone.score >= 500 ? 'RARE' : 'COMMON',
                points: Math.floor(milestone.score * 0.1),
                criteria: { milestoneScore: milestone.score, source: 'EVENT' }
              }
            })
          }

          // Award achievement
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              metadata: {
                eventId,
                eventTitle: event.title,
                scoreAtAchievement: currentScore,
                rankAtAchievement: currentRank
              }
            }
          })

          // Award points
          if (achievement.points > 0) {
            await prisma.userPoints.upsert({
              where: { userId },
              update: {
                totalPoints: {
                  increment: achievement.points
                }
              },
              create: {
                userId,
                totalPoints: achievement.points
              }
            })

            await prisma.pointTransaction.create({
              data: {
                userId,
                points: achievement.points,
                type: 'BONUS',
                reason: 'Achievement bonus',
                description: `Conquista desbloqueada: ${achievement.name}`,
                metadata: {
                  achievementId: achievement.id,
                  eventId
                }
              }
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking event achievements:', err)
  }
}