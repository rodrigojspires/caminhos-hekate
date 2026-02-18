import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  Prisma,
  prisma,
  MahaLilahParticipantRole,
  MahaLilahRoomStatus
} from '@hekate/database'

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

function toPercent(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

function extractIntentionThemes(raw: string) {
  const normalized = raw.replace(/\r/g, '\n')
  const parts = normalized
    .split(/[,\n;|/•]+/g)
    .map((value) => value.trim())
    .filter(Boolean)

  if (parts.length > 0) {
    return Array.from(new Set(parts))
  }

  const fallback = normalized.trim()
  return fallback ? [fallback] : []
}

function normalizeThemeKey(theme: string) {
  return theme
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const createdAtRange = parseDateRange(from, to)

    const roomWhere: Prisma.MahaLilahRoomWhereInput = {
      createdByUserId: session.user.id
    }
    if (createdAtRange.gte || createdAtRange.lte) {
      roomWhere.createdAt = createdAtRange
    }

    const rooms = await prisma.mahaLilahRoom.findMany({
      where: roomWhere,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        therapistPlays: true,
        therapistSoloPlay: true,
        invites: {
          select: {
            acceptedAt: true
          }
        },
        participants: {
          where: {
            role: MahaLilahParticipantRole.PLAYER
          },
          select: {
            gameIntention: true,
            consentAcceptedAt: true
          }
        },
        _count: {
          select: {
            moves: true,
            therapyEntries: true,
            aiReports: true
          }
        }
      }
    })

    const roomIds = rooms.map((room) => room.id)
    const moveWindows = roomIds.length
      ? await prisma.mahaLilahMove.groupBy({
          by: ['roomId'],
          where: {
            roomId: {
              in: roomIds
            }
          },
          _min: {
            createdAt: true
          },
          _max: {
            createdAt: true
          },
          _count: {
            _all: true
          }
        })
      : []

    const moveWindowByRoomId = new Map(
      moveWindows.map((window) => [window.roomId, window] as const)
    )

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [roomsCreatedLast7Days, roomsCreatedLast30Days, aiReportsGeneratedMonth, aiReportsGeneratedTotal] =
      await Promise.all([
        prisma.mahaLilahRoom.count({
          where: {
            createdByUserId: session.user.id,
            createdAt: {
              gte: sevenDaysAgo
            }
          }
        }),
        prisma.mahaLilahRoom.count({
          where: {
            createdByUserId: session.user.id,
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        prisma.mahaLilahAiReport.count({
          where: {
            room: {
              createdByUserId: session.user.id
            },
            createdAt: {
              gte: monthStart
            }
          }
        }),
        prisma.mahaLilahAiReport.count({
          where: {
            room: {
              createdByUserId: session.user.id
            }
          }
        })
      ])

    const totalRoomsCount = rooms.length
    const totalMoves = rooms.reduce((sum, room) => sum + room._count.moves, 0)
    const totalAiReports = rooms.reduce((sum, room) => sum + room._count.aiReports, 0)
    const totalTherapyEntries = rooms.reduce((sum, room) => sum + room._count.therapyEntries, 0)

    const roomsWithoutMoves = rooms.filter((room) => room._count.moves === 0).length
    const sessionsWithRecordsCount = rooms.filter((room) => room._count.therapyEntries > 0).length

    const activeRoomsCount = rooms.filter((room) => room.status === MahaLilahRoomStatus.ACTIVE).length
    const closedRoomsCount = rooms.filter((room) => room.status === MahaLilahRoomStatus.CLOSED).length
    const completedRoomsCount = rooms.filter((room) => room.status === MahaLilahRoomStatus.COMPLETED).length

    const therapistPlaysTogetherCount = rooms.filter(
      (room) => room.therapistPlays && !room.therapistSoloPlay
    ).length
    const therapistNotPlayingCount = rooms.filter((room) => !room.therapistPlays).length
    const therapistSoloCount = rooms.filter((room) => room.therapistSoloPlay).length

    const invitesAcceptedCount = rooms.reduce(
      (sum, room) => sum + room.invites.filter((invite) => Boolean(invite.acceptedAt)).length,
      0
    )
    const invitesPendingCount = rooms.reduce(
      (sum, room) => sum + room.invites.filter((invite) => !invite.acceptedAt).length,
      0
    )
    const invitesTotalCount = invitesAcceptedCount + invitesPendingCount

    const consentsAcceptedCount = rooms.reduce(
      (sum, room) =>
        sum + room.participants.filter((participant) => Boolean(participant.consentAcceptedAt)).length,
      0
    )
    const consentsPendingCount = rooms.reduce(
      (sum, room) =>
        sum + room.participants.filter((participant) => !participant.consentAcceptedAt).length,
      0
    )
    const consentsTotalCount = consentsAcceptedCount + consentsPendingCount

    let startedRoomsCount = 0
    let totalDurationMs = 0
    for (const window of moveWindows) {
      const min = window._min.createdAt
      const max = window._max.createdAt
      if (!min || !max || window._count._all <= 0) {
        continue
      }
      startedRoomsCount += 1
      totalDurationMs += Math.max(0, max.getTime() - min.getTime())
    }

    const completionRatePercent = toPercent(completedRoomsCount, startedRoomsCount)
    const averageDurationMinutes =
      startedRoomsCount > 0 ? totalDurationMs / startedRoomsCount / 60000 : null
    const totalDurationMinutes = totalDurationMs / 60000

    let lastSession: {
      id: string
      code: string
      status: MahaLilahRoomStatus
      createdAt: string
      lastMoveAt: string | null
    } | null = null
    let lastSessionTimestamp = Number.NEGATIVE_INFINITY

    for (const room of rooms) {
      const moveWindow = moveWindowByRoomId.get(room.id)
      const lastMoveAt = moveWindow?._max?.createdAt || null
      const referenceDate = lastMoveAt || room.createdAt
      const timestamp = referenceDate.getTime()
      if (!Number.isFinite(timestamp) || timestamp < lastSessionTimestamp) {
        continue
      }

      lastSessionTimestamp = timestamp
      lastSession = {
        id: room.id,
        code: room.code,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        lastMoveAt: lastMoveAt ? lastMoveAt.toISOString() : null
      }
    }

    const daysSinceLastSession =
      Number.isFinite(lastSessionTimestamp) && lastSessionTimestamp > Number.NEGATIVE_INFINITY
        ? Math.floor((now.getTime() - lastSessionTimestamp) / (24 * 60 * 60 * 1000))
        : null

    const intentionThemeMap = new Map<
      string,
      {
        theme: string
        count: number
        rooms: Map<
          string,
          {
            id: string
            code: string
            status: MahaLilahRoomStatus
            createdAt: string
            matchCount: number
            intentions: Set<string>
          }
        >
      }
    >()

    for (const room of rooms) {
      for (const participant of room.participants) {
        const rawIntention = participant.gameIntention?.trim()
        if (!rawIntention) continue
        const themes = extractIntentionThemes(rawIntention)
        for (const theme of themes) {
          const key = normalizeThemeKey(theme)
          if (!key) continue

          const current =
            intentionThemeMap.get(key) ||
            {
              theme,
              count: 0,
              rooms: new Map()
            }

          current.count += 1
          const roomCurrent =
            current.rooms.get(room.id) ||
            {
              id: room.id,
              code: room.code,
              status: room.status,
              createdAt: room.createdAt.toISOString(),
              matchCount: 0,
              intentions: new Set<string>()
            }
          roomCurrent.matchCount += 1
          roomCurrent.intentions.add(rawIntention)
          current.rooms.set(room.id, roomCurrent)
          intentionThemeMap.set(key, current)
        }
      }
    }

    const intentionThemes = Array.from(intentionThemeMap.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.theme.localeCompare(b.theme, 'pt-BR')
      })
      .map((item) => ({
        theme: item.theme,
        count: item.count,
        rooms: Array.from(item.rooms.values())
          .sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            )
          })
          .map((room) => ({
            id: room.id,
            code: room.code,
            status: room.status,
            createdAt: room.createdAt,
            matchCount: room.matchCount,
            intentions: Array.from(room.intentions.values())
          }))
      }))

    return NextResponse.json({
      indicators: {
        period: {
          from: createdAtRange.gte ? createdAtRange.gte.toISOString() : null,
          to: createdAtRange.lte ? createdAtRange.lte.toISOString() : null,
          roomsCount: totalRoomsCount
        },
        lastSession,
        invites: {
          pending: invitesPendingCount,
          accepted: invitesAcceptedCount,
          total: invitesTotalCount
        },
        roomsWithoutMoves,
        consents: {
          pending: consentsPendingCount,
          accepted: consentsAcceptedCount,
          total: consentsTotalCount
        },
        statuses: {
          completed: {
            count: completedRoomsCount,
            percent: toPercent(completedRoomsCount, totalRoomsCount)
          },
          closed: {
            count: closedRoomsCount,
            percent: toPercent(closedRoomsCount, totalRoomsCount)
          },
          active: {
            count: activeRoomsCount,
            percent: toPercent(activeRoomsCount, totalRoomsCount)
          }
        },
        averages: {
          movesPerRoom: totalRoomsCount > 0 ? totalMoves / totalRoomsCount : 0,
          aiPerRoom: totalRoomsCount > 0 ? totalAiReports / totalRoomsCount : 0,
          therapyPerRoom: totalRoomsCount > 0 ? totalTherapyEntries / totalRoomsCount : 0
        },
        completionRatePercent,
        gameplay: {
          averageDurationMinutes,
          totalDurationMinutes,
          startedRoomsCount
        },
        roomsCreatedLast7Days,
        roomsCreatedLast30Days,
        daysSinceLastSession,
        aiReportsGenerated: {
          month: aiReportsGeneratedMonth,
          total: aiReportsGeneratedTotal
        },
        sessionsWithRecords: {
          count: sessionsWithRecordsCount,
          percent: toPercent(sessionsWithRecordsCount, totalRoomsCount)
        },
        therapistModes: {
          playsTogether: therapistPlaysTogetherCount,
          notPlaying: therapistNotPlayingCount,
          solo: therapistSoloCount
        },
        intentionThemes
      }
    })
  } catch (error) {
    console.error('Erro ao carregar indicadores Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
