import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/groups/stats - Obter estatísticas dos grupos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    // Buscar estatísticas em paralelo
    const [totalGroups, myGroups, totalMembers, totalMessages, totalEvents] = await Promise.all([
      // Total de grupos públicos ou onde o usuário é membro
      prisma.group.count({
        where: {
          OR: [
            { visibility: 'PUBLIC' },
            {
              members: {
                some: {
                  userId: userId,
                  status: 'ACTIVE'
                }
              }
            }
          ]
        }
      }),

      // Grupos onde o usuário é membro ativo
      prisma.group.count({
        where: {
          members: {
            some: {
              userId: userId,
              status: 'ACTIVE'
            }
          }
        }
      }),

      // Total de membros em todos os grupos onde o usuário participa
      prisma.groupMember.count({
        where: {
          status: 'ACTIVE',
          group: {
            members: {
              some: {
                userId: userId,
                status: 'ACTIVE'
              }
            }
          }
        }
      }),

      // Total de mensagens nos grupos onde o usuário participa
      prisma.groupMessage.count({
        where: {
          group: {
            members: {
              some: {
                userId: userId,
                status: 'ACTIVE'
              }
            }
          }
        }
      }),

      // Total de eventos nos grupos onde o usuário participa
      prisma.groupEvent.count({
        where: {
          group: {
            members: {
              some: {
                userId: userId,
                status: 'ACTIVE'
              }
            }
          }
        }
      })
    ])

    const stats = {
      totalGroups,
      myGroups,
      totalMembers,
      totalMessages,
      totalEvents
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos grupos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}