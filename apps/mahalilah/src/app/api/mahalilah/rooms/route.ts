import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  prisma,
  MahaLilahInviteRole,
  MahaLilahParticipantRole,
  MahaLilahRoomStatus,
  MahaLilahPlanType
} from '@hekate/database'
import { z } from 'zod'
import { generateRoomCode } from '@/lib/mahalilah/room-code'
import { RULES } from '@hekate/mahalilah-core'

const CreateRoomSchema = z.object({
  maxParticipants: z.number().int().min(1).max(12).default(4),
  therapistPlays: z.boolean().default(true),
  therapistSoloPlay: z.boolean().default(false),
  trial: z.boolean().default(false)
})

async function ensureUniqueCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode()
    const exists = await prisma.mahaLilahRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Não foi possível gerar um código único para a sala.')
}

function isTrialRoom(room: {
  isTrial: boolean | null
}) {
  return Boolean(room.isTrial)
}

function parseDateRange(from?: string | null, to?: string | null) {
  const range: { gte?: Date; lte?: Date } = {}
  if (from) {
    const fromDate = from.length === 10 ? new Date(`${from}T00:00:00`) : new Date(from)
    if (!Number.isNaN(fromDate.getTime())) {
      range.gte = fromDate
    }
  }
  if (to) {
    const toDate = to.length === 10 ? new Date(`${to}T23:59:59.999`) : new Date(to)
    if (!Number.isNaN(toDate.getTime())) {
      range.lte = toDate
    }
  }
  return range
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  const d = new Date(expiresAt)
  return Number.isNaN(d.getTime()) ? false : d.getTime() < Date.now()
}

type Entitlement = {
  source: 'ORDER' | 'USER_SUBSCRIPTION'
  planType: MahaLilahPlanType
  maxParticipants: number
  allowTherapistSoloPlay: boolean
  roomsLimit: number | null
  roomsUsed: number
  orderId?: string
  userSubscriptionId?: string
}

type PlanSettings = {
  allowTherapistSoloPlay: boolean
  roomsPerMonth: number | null
}

type ActiveQuota = {
  source: 'ORDER' | 'USER_SUBSCRIPTION'
  planType: MahaLilahPlanType
  roomsLimit: number | null
  roomsUsed: number
  periodStart: Date | null
  periodEnd: Date | null
  billingInterval: string | null
}

type MahaMetadata = {
  planType?: string
  maxParticipants?: number
  allowTherapistSoloPlay?: boolean
  roomsLimit?: number | null
  roomsUsed?: number
  billingInterval?: string | null
  tipsPerPlayer?: number
  summaryLimit?: number
  progressSummaryEveryMoves?: number
  durationDays?: number
  active?: boolean
  expiresAt?: string | null
}

function parseOrderMahaMetadata(raw: unknown): MahaMetadata | null {
  const metadata = (raw as any)?.mahalilah
  if (!metadata || typeof metadata !== 'object') return null
  return metadata as MahaMetadata
}

function parseSubscriptionMahaMetadata(raw: unknown): MahaMetadata | null {
  const metadata = raw as any
  if (!metadata || typeof metadata !== 'object') return null
  if (metadata.app !== 'mahalilah') return null
  if (!metadata.mahalilah || typeof metadata.mahalilah !== 'object') return null
  return metadata.mahalilah as MahaMetadata
}

function normalizePlanType(planType: string | undefined): MahaLilahPlanType | null {
  if (planType === 'SINGLE_SESSION') return MahaLilahPlanType.SINGLE_SESSION
  if (planType === 'SUBSCRIPTION') return MahaLilahPlanType.SUBSCRIPTION
  if (planType === 'SUBSCRIPTION_LIMITED') return MahaLilahPlanType.SUBSCRIPTION_LIMITED
  return null
}

function isSubscriptionExpired(currentPeriodEnd?: Date | null) {
  if (!currentPeriodEnd) return false
  return currentPeriodEnd.getTime() < Date.now()
}

async function getPlanSettingsByType(): Promise<Map<MahaLilahPlanType, PlanSettings>> {
  const db = prisma as any
  const plans = await db.mahaLilahPlan.findMany({
    where: {
      planType: { in: ['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED'] }
    },
    select: {
      planType: true,
      allowTherapistSoloPlay: true,
      roomsPerMonth: true
    }
  })

  return new Map<MahaLilahPlanType, PlanSettings>(
    plans.map(
      (plan: any) =>
        [
          plan.planType as MahaLilahPlanType,
          {
            allowTherapistSoloPlay: Boolean(plan.allowTherapistSoloPlay),
            roomsPerMonth:
              plan.roomsPerMonth == null ? null : Number(plan.roomsPerMonth)
          }
        ] as [MahaLilahPlanType, PlanSettings]
    )
  )
}

function resolveAllowTherapistSoloPlay(params: {
  metadataValue: unknown
  planType: MahaLilahPlanType
  byPlanType: Map<MahaLilahPlanType, PlanSettings>
}) {
  if (typeof params.metadataValue === 'boolean') {
    return params.metadataValue
  }
  if (params.byPlanType.has(params.planType)) {
    return Boolean(params.byPlanType.get(params.planType)?.allowTherapistSoloPlay)
  }
  return true
}

async function findEntitlement(
  userId: string,
  requestedMax: number,
  planSettingsByType: Map<MahaLilahPlanType, PlanSettings>
) {
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING'] }
    },
    orderBy: { createdAt: 'desc' }
  })

  for (const subscription of subscriptions) {
    const meta = parseSubscriptionMahaMetadata(subscription.metadata)
    if (!meta) continue
    if (isSubscriptionExpired(subscription.currentPeriodEnd)) continue

    const planType = normalizePlanType(meta.planType)
    if (
      planType !== MahaLilahPlanType.SUBSCRIPTION &&
      planType !== MahaLilahPlanType.SUBSCRIPTION_LIMITED
    ) {
      continue
    }

    const maxParticipants = Number(meta.maxParticipants || 0)
    if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) continue
    if (requestedMax > maxParticipants) continue

    const roomsLimit =
      meta.roomsLimit === null || meta.roomsLimit === undefined
        ? null
        : Number(meta.roomsLimit)
    const roomsUsed = Number(meta.roomsUsed || 0)
    if (roomsLimit !== null && Number.isFinite(roomsLimit) && roomsUsed >= roomsLimit) {
      continue
    }

    return {
      source: 'USER_SUBSCRIPTION',
      userSubscriptionId: subscription.id,
      planType,
      maxParticipants,
      allowTherapistSoloPlay: resolveAllowTherapistSoloPlay({
        metadataValue: meta.allowTherapistSoloPlay,
        planType,
        byPlanType: planSettingsByType
      }),
      roomsLimit: roomsLimit !== null && Number.isFinite(roomsLimit) ? roomsLimit : null,
      roomsUsed
    } satisfies Entitlement
  }

  const orders = await prisma.order.findMany({
    where: { userId, status: 'PAID' },
    orderBy: { createdAt: 'desc' }
  })

  for (const order of orders) {
    const meta = parseOrderMahaMetadata(order.metadata)
    if (!meta || meta.active !== true) continue
    if (isExpired(meta.expiresAt)) continue
    const planType = normalizePlanType(meta.planType)
    if (
      planType !== MahaLilahPlanType.SUBSCRIPTION &&
      planType !== MahaLilahPlanType.SUBSCRIPTION_LIMITED
    ) {
      continue
    }
    if (meta.roomsLimit != null && Number(meta.roomsUsed || 0) >= Number(meta.roomsLimit)) continue
    if (requestedMax > Number(meta.maxParticipants || 0)) continue

    return {
      source: 'ORDER',
      orderId: order.id,
      planType,
      maxParticipants: Number(meta.maxParticipants || 0),
      allowTherapistSoloPlay: resolveAllowTherapistSoloPlay({
        metadataValue: meta.allowTherapistSoloPlay,
        planType,
        byPlanType: planSettingsByType
      }),
      roomsLimit:
        meta.roomsLimit === null || meta.roomsLimit === undefined
          ? null
          : Number(meta.roomsLimit),
      roomsUsed: Number(meta.roomsUsed || 0)
    } satisfies Entitlement
  }

  return null
}

async function findActiveQuota(
  userId: string,
  planSettingsByType: Map<MahaLilahPlanType, PlanSettings>
): Promise<ActiveQuota | null> {
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING'] }
    },
    orderBy: { createdAt: 'desc' }
  })

  for (const subscription of subscriptions) {
    const meta = parseSubscriptionMahaMetadata(subscription.metadata)
    if (!meta) continue
    if (isSubscriptionExpired(subscription.currentPeriodEnd)) continue

    const planType = normalizePlanType(meta.planType)
    if (
      planType !== MahaLilahPlanType.SUBSCRIPTION &&
      planType !== MahaLilahPlanType.SUBSCRIPTION_LIMITED
    ) {
      continue
    }

    const configuredRoomsPerMonth =
      planSettingsByType.get(planType)?.roomsPerMonth ?? null
    const roomsLimit =
      meta.roomsLimit === null || meta.roomsLimit === undefined
        ? configuredRoomsPerMonth
        : Number(meta.roomsLimit)
    const roomsUsed = Number(meta.roomsUsed || 0)

    return {
      source: 'USER_SUBSCRIPTION',
      planType,
      roomsLimit:
        roomsLimit !== null && Number.isFinite(roomsLimit) ? roomsLimit : null,
      roomsUsed: Number.isFinite(roomsUsed) ? roomsUsed : 0,
      periodStart: subscription.currentPeriodStart ?? null,
      periodEnd: subscription.currentPeriodEnd ?? null,
      billingInterval:
        typeof meta.billingInterval === 'string' ? meta.billingInterval : null
    }
  }

  const orders = await prisma.order.findMany({
    where: { userId, status: 'PAID' },
    orderBy: { createdAt: 'desc' }
  })

  for (const order of orders) {
    const meta = parseOrderMahaMetadata(order.metadata)
    if (!meta || meta.active !== true) continue
    if (isExpired(meta.expiresAt)) continue

    const planType = normalizePlanType(meta.planType)
    if (
      planType !== MahaLilahPlanType.SUBSCRIPTION &&
      planType !== MahaLilahPlanType.SUBSCRIPTION_LIMITED
    ) {
      continue
    }

    const configuredRoomsPerMonth =
      planSettingsByType.get(planType)?.roomsPerMonth ?? null
    const roomsLimit =
      meta.roomsLimit === null || meta.roomsLimit === undefined
        ? configuredRoomsPerMonth
        : Number(meta.roomsLimit)
    const roomsUsed = Number(meta.roomsUsed || 0)
    const activatedAt =
      typeof (meta as any).activatedAt === 'string'
        ? new Date((meta as any).activatedAt)
        : null
    const expiresAt =
      typeof meta.expiresAt === 'string' ? new Date(meta.expiresAt) : null

    return {
      source: 'ORDER',
      planType,
      roomsLimit:
        roomsLimit !== null && Number.isFinite(roomsLimit) ? roomsLimit : null,
      roomsUsed: Number.isFinite(roomsUsed) ? roomsUsed : 0,
      periodStart:
        activatedAt && !Number.isNaN(activatedAt.getTime()) ? activatedAt : null,
      periodEnd: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      billingInterval: null
    }
  }

  return null
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, any> = {
      OR: [
        { createdByUserId: session.user.id },
        {
          isVisibleToPlayers: true,
          participants: { some: { userId: session.user.id } }
        }
      ]
    }
    if (status && ['ACTIVE', 'CLOSED', 'COMPLETED'].includes(status)) {
      where.status = status
    }
    const createdAtRange = parseDateRange(from, to)
    if (createdAtRange.gte || createdAtRange.lte) {
      where.createdAt = createdAtRange
    }

    const planSettingsByType = await getPlanSettingsByType()

    const [rooms, entitlementForCreate, trialRoom, activeQuota] = await Promise.all([
      prisma.mahaLilahRoom.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              metadata: true
            }
          },
          invites: {
            where: {
              role: MahaLilahInviteRole.PLAYER
            }
          },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          },
          playerStates: true,
          _count: {
            select: {
              moves: true,
              therapyEntries: true,
              cardDraws: true,
              aiReports: true
            }
          }
        }
      }),
      findEntitlement(session.user.id, 1, planSettingsByType),
      prisma.mahaLilahRoom.findFirst({
        where: {
          createdByUserId: session.user.id,
          isTrial: true
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true }
      }),
      findActiveQuota(session.user.id, planSettingsByType)
    ])

    const roomIds = rooms.map((room) => room.id)
    const roomIdsFilter = roomIds.length > 0 ? { in: roomIds } : undefined

    const [
      movesByRoomParticipant,
      therapyEntriesByRoomParticipant,
      cardDrawsByRoomParticipant,
      aiReportsByRoomParticipant
    ] = roomIdsFilter
      ? await Promise.all([
          prisma.mahaLilahMove.groupBy({
            by: ['roomId', 'participantId'],
            where: { roomId: roomIdsFilter },
            _count: { _all: true }
          }),
          prisma.mahaLilahTherapyEntry.groupBy({
            by: ['roomId', 'participantId'],
            where: { roomId: roomIdsFilter },
            _count: { _all: true }
          }),
          prisma.mahaLilahCardDraw.groupBy({
            by: ['roomId', 'drawnByParticipantId'],
            where: {
              roomId: roomIdsFilter,
              drawnByParticipantId: { not: null }
            },
            _count: { _all: true }
          }),
          prisma.mahaLilahAiReport.groupBy({
            by: ['roomId', 'participantId'],
            where: {
              roomId: roomIdsFilter,
              participantId: { not: null }
            },
            _count: { _all: true }
          })
        ])
      : [[], [], [], []]

    const movesCountByRoomParticipant = new Map<string, number>()
    movesByRoomParticipant.forEach((item) => {
      movesCountByRoomParticipant.set(
        `${item.roomId}:${item.participantId}`,
        item._count._all
      )
    })

    const therapyEntriesCountByRoomParticipant = new Map<string, number>()
    therapyEntriesByRoomParticipant.forEach((item) => {
      therapyEntriesCountByRoomParticipant.set(
        `${item.roomId}:${item.participantId}`,
        item._count._all
      )
    })

    const cardDrawsCountByRoomParticipant = new Map<string, number>()
    cardDrawsByRoomParticipant.forEach((item) => {
      if (!item.drawnByParticipantId) return
      cardDrawsCountByRoomParticipant.set(
        `${item.roomId}:${item.drawnByParticipantId}`,
        item._count._all
      )
    })

    const aiReportsCountByRoomParticipant = new Map<string, number>()
    aiReportsByRoomParticipant.forEach((item) => {
      if (!item.participantId) return
      aiReportsCountByRoomParticipant.set(
        `${item.roomId}:${item.participantId}`,
        item._count._all
      )
    })

    const catalogLimitedPlanMaxRooms =
      planSettingsByType.get(MahaLilahPlanType.SUBSCRIPTION_LIMITED)
        ?.roomsPerMonth ?? null

    return NextResponse.json({
      currentUserId: session.user.id,
      canCreateRoom: Boolean(entitlementForCreate),
      canUseTherapistSoloPlay: Boolean(entitlementForCreate?.allowTherapistSoloPlay),
      hasUsedTrial: Boolean(trialRoom),
      trialRoomStatus: trialRoom?.status ?? null,
      roomQuota: activeQuota
        ? {
            source: activeQuota.source,
            planType: activeQuota.planType,
            roomsUsed: activeQuota.roomsUsed,
            roomsLimit: activeQuota.roomsLimit,
            roomsRemaining:
              activeQuota.roomsLimit == null
                ? null
                : Math.max(0, activeQuota.roomsLimit - activeQuota.roomsUsed),
            periodStart: activeQuota.periodStart?.toISOString() ?? null,
            periodEnd: activeQuota.periodEnd?.toISOString() ?? null,
            billingInterval: activeQuota.billingInterval,
            catalogRoomsLimit:
              activeQuota.planType === MahaLilahPlanType.SUBSCRIPTION_LIMITED
                ? catalogLimitedPlanMaxRooms
                : null
          }
        : null,
      rooms: rooms.map((room) => {
        const viewerParticipant = room.participants.find(
          (participant) => participant.userId === session.user.id
        )
        const viewerRole = room.createdByUserId === session.user.id
          ? MahaLilahParticipantRole.THERAPIST
          : viewerParticipant?.role || MahaLilahParticipantRole.PLAYER

        const therapistParticipant = room.participants.find(
          (participant) => participant.role === MahaLilahParticipantRole.THERAPIST
        )
        const statsByParticipant = room.participants.map((participant) => {
          const playerState =
            room.playerStates.find(
              (state) => state.participantId === participant.id
            ) || null
          const mapKey = `${room.id}:${participant.id}`
          return {
            participantId: participant.id,
            participantName: participant.user.name || participant.user.email,
            role: participant.role,
            moves: movesCountByRoomParticipant.get(mapKey) || 0,
            rollsTotal: playerState?.rollCountTotal || 0,
            rollsUntilStart: playerState?.rollCountUntilStart || 0,
            therapyEntries:
              therapyEntriesCountByRoomParticipant.get(mapKey) || 0,
            cardDraws: cardDrawsCountByRoomParticipant.get(mapKey) || 0,
            aiReports: aiReportsCountByRoomParticipant.get(mapKey) || 0
          }
        })
        const rollsTotal = statsByParticipant.reduce(
          (sum, participantStats) => sum + participantStats.rollsTotal,
          0
        )
        const rollsUntilStart = statsByParticipant.reduce(
          (sum, participantStats) => sum + participantStats.rollsUntilStart,
          0
        )
        const orderMetadata = (room.order?.metadata as any) || {}
        const autoRoomId = orderMetadata?.mahalilah?.autoRoomId
        const isAutoCreatedFromCheckout =
          typeof autoRoomId === 'string' && autoRoomId === room.id

        return {
          id: room.id,
          code: room.code,
          status: room.status,
          planType: room.planType,
          viewerRole,
          canManage: room.createdByUserId === session.user.id,
          canDelete:
            room.createdByUserId === session.user.id &&
            room._count.moves === 0 &&
            room.planType !== MahaLilahPlanType.SINGLE_SESSION,
          maxParticipants: room.maxParticipants,
          therapistPlays: room.therapistPlays,
          therapistSoloPlay: room.therapistSoloPlay,
          isVisibleToPlayers: room.isVisibleToPlayers,
          isTrial: isTrialRoom(room),
          isAutoCreatedFromCheckout,
          createdAt: room.createdAt,
          invites: room.invites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            acceptedAt: invite.acceptedAt,
            sentAt: invite.sentAt
          })),
          participants: room.participants.map((participant) => ({
            id: participant.id,
            role: participant.role,
            consentAcceptedAt: participant.consentAcceptedAt,
            therapistSummary: participant.therapistSummary,
            user: participant.user
          })),
          participantsCount: room.participants.filter((participant) => (
            participant.role === MahaLilahParticipantRole.PLAYER ||
            (room.therapistPlays && participant.role === MahaLilahParticipantRole.THERAPIST)
          )).length,
          stats: {
            moves: room._count.moves,
            therapyEntries: room._count.therapyEntries,
            cardDraws: room._count.cardDraws,
            aiReports: room._count.aiReports,
            rollsTotal,
            rollsUntilStart,
            byParticipant: statsByParticipant
          },
          startHouse: RULES.start.house
        }
      })
    })
  } catch (error) {
    console.error('Erro ao listar salas Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = CreateRoomSchema.parse(payload)
    const planSettingsByType = await getPlanSettingsByType()

    let therapistSoloPlay = Boolean(data.therapistSoloPlay)
    let therapistPlays = therapistSoloPlay ? true : data.therapistPlays

    const code = await ensureUniqueCode()
    const consentTextVersion = process.env.MAHALILAH_CONSENT_VERSION || 'v1'

    if (data.trial) {
      const trialRoom = await prisma.$transaction(async (tx) => {
        const existingTrial = await tx.mahaLilahRoom.findFirst({
          where: {
            createdByUserId: session.user.id,
            isTrial: true
          },
          select: { id: true, code: true }
        })

        if (existingTrial) {
          throw new Error('TRIAL_ALREADY_EXISTS')
        }

        const created = await tx.mahaLilahRoom.create({
          data: {
            code,
            createdByUserId: session.user.id,
            status: MahaLilahRoomStatus.ACTIVE,
            maxParticipants: 1,
            therapistPlays: true,
            therapistSoloPlay: false,
            planType: MahaLilahPlanType.SINGLE_SESSION,
            isTrial: true,
            consentTextVersion
          }
        })

        await tx.mahaLilahParticipant.create({
          data: {
            roomId: created.id,
            userId: session.user.id,
            role: MahaLilahParticipantRole.THERAPIST,
            displayName: session.user.name || null
          }
        })

        await tx.mahaLilahGameState.create({
          data: { roomId: created.id }
        })

        return created
      })

      return NextResponse.json({ room: trialRoom })
    }

    const entitlement = await findEntitlement(
      session.user.id,
      data.maxParticipants,
      planSettingsByType
    )
    if (!entitlement) {
      return NextResponse.json({ error: 'Sem plano ativo. Finalize a compra para criar a sala.' }, { status: 402 })
    }
    if (therapistSoloPlay && !entitlement.allowTherapistSoloPlay) {
      return NextResponse.json(
        { error: 'Seu plano não permite o modo somente visualização para jogadores.' },
        { status: 403 }
      )
    }
    therapistSoloPlay = entitlement.allowTherapistSoloPlay ? therapistSoloPlay : false
    therapistPlays = therapistSoloPlay ? true : data.therapistPlays

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.mahaLilahRoom.create({
        data: {
          code,
          createdByUserId: session.user.id,
          status: MahaLilahRoomStatus.ACTIVE,
          maxParticipants: data.maxParticipants,
          therapistPlays,
          therapistSoloPlay,
          isTrial: false,
          planType: entitlement.planType,
          orderId:
            entitlement.source === 'ORDER' ? entitlement.orderId : undefined,
          consentTextVersion
        }
      })

      await tx.mahaLilahParticipant.create({
        data: {
          roomId: created.id,
          userId: session.user.id,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: session.user.name || null
        }
      })

      await tx.mahaLilahGameState.create({
        data: { roomId: created.id }
      })

      if (entitlement.source === 'ORDER' && entitlement.orderId) {
        const order = await tx.order.findUnique({ where: { id: entitlement.orderId } })
        if (order) {
          const metadata = (order.metadata as any) || {}
          const meta = metadata.mahalilah || {}
          await tx.order.update({
            where: { id: order.id },
            data: {
              metadata: {
                ...metadata,
                mahalilah: {
                  ...meta,
                  roomsUsed: (meta.roomsUsed || 0) + 1
                }
              }
            }
          })
        }
      }

      if (entitlement.source === 'USER_SUBSCRIPTION' && entitlement.userSubscriptionId) {
        const subscription = await tx.userSubscription.findUnique({
          where: { id: entitlement.userSubscriptionId }
        })
        if (subscription) {
          const metadata = (subscription.metadata as any) || {}
          const maha = metadata.mahalilah || {}
          await tx.userSubscription.update({
            where: { id: subscription.id },
            data: {
              metadata: {
                ...metadata,
                mahalilah: {
                  ...maha,
                  roomsUsed: Number(maha.roomsUsed || 0) + 1
                }
              }
            }
          })
        }
      }

      return created
    })

    return NextResponse.json({ room })
  } catch (error) {
    if (error instanceof Error && error.message === 'TRIAL_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'Você já possui uma sala trial e não pode criar outra.' },
        { status: 409 }
      )
    }
    console.error('Erro ao criar sala Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
