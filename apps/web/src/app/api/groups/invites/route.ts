import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberRole, GroupMemberStatus, GroupInvitationStatus } from '@hekate/database'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'

// Schema para validação de convites
const CreateInviteSchema = z.object({
  type: z.enum(['EMAIL', 'LINK']),
  emails: z.array(z.string().email()).optional(),
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']).default('MEMBER'),
  message: z.string().max(500).optional(),
  expiresIn: z.string().optional(), // '1h', '24h', '7d', '30d', 'never'
  maxUses: z.number().min(1).max(100).optional()
})

const JoinByTokenSchema = z.object({
  token: z.string().min(1)
})

// POST /api/groups/invites - Criar convites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateInviteSchema.parse(body)
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'ID do grupo é obrigatório' }, { status: 400 })
    }

    // Verificar se o usuário é membro ativo do grupo
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: session.user.id,
        status: GroupMemberStatus.ACTIVE
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Você não é membro deste grupo' }, { status: 403 })
    }

    // Buscar dados do grupo e contagem de membros ativos
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        maxMembers: true
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const activeMembersCount = await prisma.groupMember.count({
      where: { groupId, status: GroupMemberStatus.ACTIVE }
    })

    // Verificar permissões baseadas no papel do usuário
    // Sem campo settings no Group, adotamos política: OWNER/ADMIN podem convidar; MODERATOR pode convidar apenas membros
    const canInvite = member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'MODERATOR'

    if (!canInvite) {
      return NextResponse.json({ error: 'Você não tem permissão para convidar membros' }, { status: 403 })
    }

    // Verificar se pode convidar para o papel especificado
    const canInviteRole = member.role === 'OWNER' || 
                         (member.role === 'ADMIN') ||
                         (member.role === 'MODERATOR' && ['MEMBER'].includes(validatedData.role))

    if (!canInviteRole) {
      return NextResponse.json({ error: 'Você não pode convidar para este papel' }, { status: 403 })
    }

    // Verificar limite de membros
    if (group.maxMembers && activeMembersCount >= group.maxMembers) {
      return NextResponse.json({ error: 'Grupo já atingiu o limite máximo de membros' }, { status: 400 })
    }

    // Calcular data de expiração
    let expiresAt: Date | null = null
    if (validatedData.expiresIn && validatedData.expiresIn !== 'never') {
      const now = new Date()
      switch (validatedData.expiresIn) {
        case '1h':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
          break
        case '24h':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
      }
    }

    // Mapear role de convite para enum do Prisma
    const inviteRole: GroupMemberRole = validatedData.role === 'ADMIN'
      ? GroupMemberRole.ADMIN
      : validatedData.role === 'MODERATOR'
        ? GroupMemberRole.MODERATOR
        : GroupMemberRole.MEMBER

    if (validatedData.type === 'EMAIL' && validatedData.emails) {
      // Criar convites por email
      const invites = []
      
      for (const email of validatedData.emails) {
        // Verificar se o usuário já é membro
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: {
            groupMemberships: {
              where: {
                groupId: groupId,
                status: GroupMemberStatus.ACTIVE
              }
            }
          }
        })

        const memberships = existingUser?.groupMemberships ?? []
        if (memberships.length > 0) {
          continue // Pular usuários que já são membros
        }

        // Verificar se já existe convite pendente
        const existingInvite = await prisma.groupInvitation.findFirst({
          where: {
            groupId: groupId,
            email: email,
            status: GroupInvitationStatus.PENDING,
            expiresAt: { gt: new Date() }
          }
        })

        if (existingInvite) {
          continue // Pular emails que já têm convite pendente
        }

        const token = randomBytes(32).toString('hex')
        
        const invite = await prisma.groupInvitation.create({
          data: {
            groupId: groupId,
            email: email,
            role: inviteRole,
            status: GroupInvitationStatus.PENDING,
            token: token,
            message: validatedData.message,
            expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            inviterId: session.user.id
          },
          include: {
            group: {
              select: {
                name: true,
                description: true
              }
            },
            inviter: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })

        invites.push(invite)

        // Enviar email de convite
        try {
          await sendEmail({
            to: email,
            subject: `Convite para o grupo ${group.name}`,
            template: 'group-invite',
            data: {
              groupName: group.name,
              groupDescription: group.description,
              inviterName: session.user.name,
              customMessage: validatedData.message,
              inviteUrl: `${process.env.NEXTAUTH_URL}/grupos/convite/${token}`,
              expiresAt: expiresAt
            }
          })
        } catch (error) {
          console.error('Erro ao enviar email de convite:', error)
        }
      }

      return NextResponse.json({
        message: 'Convites criados com sucesso',
        count: invites.length
      })
    }

    // Criar convite por link
    const token = randomBytes(32).toString('hex')

    const linkInvite = await prisma.groupInvitation.create({
      data: {
        groupId: groupId,
        role: inviteRole,
        status: GroupInvitationStatus.PENDING,
        token: token,
        message: validatedData.message,
        expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: session.user.id
      }
    })

    return NextResponse.json({
      message: 'Convite por link criado com sucesso',
      token: linkInvite.token
    })
  } catch (error) {
    console.error('Erro ao criar convites:', error)
    return NextResponse.json({ error: 'Erro ao criar convites' }, { status: 500 })
  }
}

// PUT /api/groups/invites - Aceitar convite por token
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = JoinByTokenSchema.parse(body)

    const invitation = await prisma.groupInvitation.findFirst({
      where: {
        token,
        status: GroupInvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      include: {
        group: true
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 400 })
    }

    // Verificar se já é membro
    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: invitation.groupId,
        userId: session.user.id,
        status: GroupMemberStatus.ACTIVE
      }
    })

    if (existingMembership) {
      return NextResponse.json({ error: 'Você já é membro deste grupo' }, { status: 400 })
    }

    // Adicionar como membro com role do convite (ou MEMBER como padrão)
    await prisma.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId: session.user.id,
        status: GroupMemberStatus.ACTIVE,
        role: invitation.role ?? GroupMemberRole.MEMBER
      }
    })

    // Marcar convite como aceito
    await prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: GroupInvitationStatus.ACCEPTED
      }
    })

    return NextResponse.json({ message: 'Convite aceito com sucesso' })
  } catch (error) {
    console.error('Erro ao aceitar convite:', error)
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
  }
}