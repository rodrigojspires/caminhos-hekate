import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'

// POST /api/gamification/points/award - Award points to user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { points, reason, metadata } = await request.json()

    if (!points || points <= 0) {
      return NextResponse.json(
        { error: 'Pontos devem ser um número positivo' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Motivo é obrigatório' },
        { status: 400 }
      )
    }

    // Get or create user points
    let userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id }
    })

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          userId: session.user.id,
          totalPoints: 0,
          currentLevel: 1,
          pointsToNext: 100
        }
      })
    }

    const previousLevel = userPoints.currentLevel
    const newTotalPoints = userPoints.totalPoints + points

    // Calculate new level
    let newLevel = userPoints.currentLevel
    let pointsToNext = userPoints.pointsToNext
    let currentPoints = newTotalPoints

    // Level up calculation (exponential growth)
    while (currentPoints >= pointsToNext) {
      currentPoints -= pointsToNext
      newLevel++
      pointsToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1))
    }

    // Update user points
    const updatedUserPoints = await prisma.userPoints.update({
      where: { userId: session.user.id },
      data: {
        totalPoints: newTotalPoints,
        currentLevel: newLevel,
        pointsToNext: pointsToNext
      }
    })

    // Create point transaction
    await prisma.pointTransaction.create({
      data: {
        userId: session.user.id,
        type: 'EARNED',
        points: points,
        reason: reason,
        description: reason,
        metadata: metadata || {}
      }
    })

    // Check for level up
    const levelUp = newLevel > previousLevel
    
    // Check for achievements based on points and level
    const newAchievements = await checkPointsAchievements(
      session.user.id,
      newTotalPoints,
      newLevel,
      levelUp
    )

    return NextResponse.json({
      userPoints: updatedUserPoints,
      levelUp,
      previousLevel,
      points: points,
      reason,
      newAchievements
    })
  } catch (error) {
    console.error('Erro ao conceder pontos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Helper function to check for points-based achievements
async function checkPointsAchievements(
  userId: string,
  totalPoints: number,
  currentLevel: number,
  levelUp: boolean
) {
  const newAchievements = []

  try {
    const pointSettings = await getGamificationPointSettings()
    // Points milestones
    const pointsMilestones = [
      { points: 100, name: 'Primeiro Centenário', description: 'Alcançou 100 pontos totais', rewardPoints: pointSettings.pointsMilestone100Bonus },
      { points: 500, name: 'Meio Milhar', description: 'Alcançou 500 pontos totais', rewardPoints: pointSettings.pointsMilestone500Bonus },
      { points: 1000, name: 'Primeiro Milhar', description: 'Alcançou 1000 pontos totais', rewardPoints: pointSettings.pointsMilestone1000Bonus },
      { points: 2500, name: 'Acumulador', description: 'Alcançou 2500 pontos totais', rewardPoints: pointSettings.pointsMilestone2500Bonus },
      { points: 5000, name: 'Colecionador', description: 'Alcançou 5000 pontos totais', rewardPoints: pointSettings.pointsMilestone5000Bonus },
      { points: 10000, name: 'Mestre dos Pontos', description: 'Alcançou 10000 pontos totais', rewardPoints: pointSettings.pointsMilestone10000Bonus }
    ]

    for (const milestone of pointsMilestones) {
      if (totalPoints >= milestone.points) {
        // Check if user already has this achievement
        const existingAchievement = await prisma.userAchievement.findFirst({
          where: {
            userId,
            achievement: {
              name: milestone.name,
              category: { is: { name: 'POINTS_MILESTONE' } }
            }
          }
        })

        if (!existingAchievement) {
          // Create or find achievement
          let achievement = await prisma.achievement.findFirst({
            where: {
              name: milestone.name,
              category: { is: { name: 'POINTS_MILESTONE' } }
            }
          })

          if (!achievement) {
            achievement = await prisma.achievement.create({
              data: {
                name: milestone.name,
                description: milestone.description,
                // Relacionar categoria corretamente
                category: {
                  connectOrCreate: {
                    where: { name: 'POINTS_MILESTONE' },
                    create: { name: 'POINTS_MILESTONE' }
                  }
                },
                rarity: milestone.points >= 5000 ? 'LEGENDARY' : 
                        milestone.points >= 2500 ? 'EPIC' : 
                        milestone.points >= 1000 ? 'RARE' : 'COMMON',
                // Usar o campo points do Achievement como recompensa
                points: milestone.rewardPoints,
                // Campo obrigatório no schema
                criteria: {}
              }
            })
          }

          // Award achievement
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              metadata: {
                pointsAtAchievement: totalPoints,
                levelAtAchievement: currentLevel
              }
            }
          })

          newAchievements.push(achievement)

          // Award bonus points
          if (achievement.points > 0) {
            await prisma.userPoints.update({
              where: { userId },
              data: {
                totalPoints: {
                  increment: achievement.points
                }
              }
            })

            await prisma.pointTransaction.create({
              data: {
                userId,
                points: achievement.points,
                type: 'BONUS',
                reason: 'Achievement bonus',
                description: `Bônus por conquista: ${achievement.name}`,
                metadata: {
                  achievementId: achievement.id
                }
              }
            })
          }
        }
      }
    }

    // Level-based achievements
    if (levelUp) {
      const levelMilestones = [
        { level: 5, name: 'Iniciante Dedicado', description: 'Alcançou o nível 5', rewardPoints: pointSettings.levelMilestone5Bonus },
        { level: 10, name: 'Estudante Aplicado', description: 'Alcançou o nível 10', rewardPoints: pointSettings.levelMilestone10Bonus },
        { level: 20, name: 'Conhecedor', description: 'Alcançou o nível 20', rewardPoints: pointSettings.levelMilestone20Bonus },
        { level: 30, name: 'Especialista', description: 'Alcançou o nível 30', rewardPoints: pointSettings.levelMilestone30Bonus },
        { level: 50, name: 'Mestre', description: 'Alcançou o nível 50', rewardPoints: pointSettings.levelMilestone50Bonus },
        { level: 100, name: 'Lenda', description: 'Alcançou o nível 100', rewardPoints: pointSettings.levelMilestone100Bonus }
      ]

      for (const milestone of levelMilestones) {
        if (currentLevel >= milestone.level) {
          // Check if user already has this achievement
          const existingAchievement = await prisma.userAchievement.findFirst({
            where: {
              userId,
              achievement: {
                name: milestone.name,
                category: { is: { name: 'LEVEL_MILESTONE' } }
              }
            }
          })

          if (!existingAchievement) {
            // Create or find achievement
            let achievement = await prisma.achievement.findFirst({
              where: {
                name: milestone.name,
                category: { is: { name: 'LEVEL_MILESTONE' } }
              }
            })

            if (!achievement) {
              achievement = await prisma.achievement.create({
                data: {
                  name: milestone.name,
                  description: milestone.description,
                  category: {
                    connectOrCreate: {
                      where: { name: 'LEVEL_MILESTONE' },
                      create: { name: 'LEVEL_MILESTONE' }
                    }
                  },
                  rarity: milestone.level >= 50 ? 'LEGENDARY' : 
                          milestone.level >= 30 ? 'EPIC' : 
                          milestone.level >= 20 ? 'RARE' : 'COMMON',
                  points: milestone.rewardPoints,
                  criteria: {}
                }
              })
            }

            // Award achievement
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
                metadata: {
                  levelAtAchievement: currentLevel,
                  pointsAtAchievement: totalPoints
                }
              }
            })

            newAchievements.push(achievement)

            // Award bonus points based on achievement points
            if (achievement.points > 0) {
              await prisma.userPoints.update({
                where: { userId },
                data: {
                  totalPoints: {
                    increment: achievement.points
                  }
                }
              })

              await prisma.pointTransaction.create({
                data: {
                  userId,
                  points: achievement.points,
                  type: 'BONUS',
                  reason: 'Achievement bonus',
                  description: `Bônus por conquista: ${achievement.name}`,
                  metadata: {
                    achievementId: achievement.id
                  }
                }
              })
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking points achievements:', error)
  }

  return newAchievements
}
