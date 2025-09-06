import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberStatus } from '@hekate/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: groupId } = params

    // Buscar o grupo com informações públicas (ajustado ao schema atual)
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        visibility: true,
        maxMembers: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: { id: true, name: true, image: true }
        },
        members: {
          where: { status: GroupMemberStatus.ACTIVE },
          take: 20, // Limitar a 20 membros para performance
          orderBy: [
            { role: 'asc' }, // Owners e admins primeiro
            { joinedAt: 'asc' } // Depois por ordem de entrada
          ],
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        },
        events: {
          where: { startDate: { gte: new Date() } }, // Apenas eventos futuros
          take: 5, // Limitar a 5 eventos
          orderBy: { startDate: 'asc' },
          include: {
            _count: {
              select: { attendees: true }
            }
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    // Se o grupo é privado, verificar se o usuário tem acesso
    if (group.visibility === 'PRIVATE') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Acesso negado. Este é um grupo privado.' },
          { status: 403 }
        )
      }

      // Verificar se o usuário é membro do grupo
      const membership = await prisma.groupMember.findFirst({
        where: { userId: session.user.id, groupId }
      })

      if (!membership || membership.status !== GroupMemberStatus.ACTIVE) {
        return NextResponse.json(
          { success: false, error: 'Acesso negado. Você não é membro deste grupo privado.' },
          { status: 403 }
        )
      }
    }

    // Verificar se o usuário atual é membro
    let isMember = false
    let memberRole: string | null = null
    let canJoin = true

    if (session?.user) {
      const membership = await prisma.groupMember.findFirst({
        where: { userId: session.user.id, groupId }
      })

      if (membership) {
        isMember = membership.status === GroupMemberStatus.ACTIVE
        memberRole = membership.role
      }
    }

    // Contar membros ativos
    const activeMembersCount = await prisma.groupMember.count({
      where: { groupId, status: GroupMemberStatus.ACTIVE }
    })

    // Verificar se o grupo pode aceitar novos membros
    if (group.maxMembers && activeMembersCount >= group.maxMembers) {
      canJoin = false
    }

    // Se é um grupo privado e o usuário não é membro, não pode entrar diretamente
    if (group.visibility === 'PRIVATE' && !isMember) {
      canJoin = false
    }

    // Contadores auxiliares
    const [messagesCount, upcomingEventsCount] = await Promise.all([
      prisma.groupMessage.count({ where: { groupId } }),
      prisma.groupEvent.count({ where: { groupId, startDate: { gte: new Date() } } })
    ])

    const responseData = {
      id: group.id,
      name: group.name,
      description: group.description,
      imageUrl: group.avatar, // manter compatibilidade com clientes atuais
      isPrivate: group.visibility === 'PRIVATE', // compatibilidade
      category: null as unknown as string | null, // campo não existe mais; manter shape
      maxMembers: group.maxMembers,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      creator: group.creator,
      _count: {
        members: activeMembersCount,
        messages: messagesCount,
        events: upcomingEventsCount
      },
      members: group.members,
      recentEvents: group.events,
      isMember,
      memberRole,
      canJoin
    }

    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('Erro ao buscar detalhes públicos do grupo:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}