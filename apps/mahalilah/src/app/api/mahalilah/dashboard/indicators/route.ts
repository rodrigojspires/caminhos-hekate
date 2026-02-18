import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  Prisma,
  prisma,
  MahaLilahInviteRole,
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

function buildWeekHourHeatmap(events: Date[]) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
  const hours = Array.from({ length: 24 }, (_, index) => index)
  const matrix = Array.from({ length: days.length }, () =>
    Array.from({ length: hours.length }, () => 0)
  )

  let max = 0
  let total = 0
  for (const eventDate of events) {
    if (!eventDate || Number.isNaN(eventDate.getTime())) continue
    const day = eventDate.getDay()
    const dayIndex = day === 0 ? 6 : day - 1
    const hour = eventDate.getHours()
    if (dayIndex < 0 || dayIndex >= days.length) continue
    if (hour < 0 || hour >= hours.length) continue

    matrix[dayIndex][hour] += 1
    total += 1
    if (matrix[dayIndex][hour] > max) {
      max = matrix[dayIndex][hour]
    }
  }

  return {
    days,
    hours,
    matrix,
    max,
    total
  }
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
          where: {
            role: MahaLilahInviteRole.PLAYER
          },
          select: {
            acceptedAt: true
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
    const roomById = new Map(
      rooms.map((room) => [room.id, room] as const)
    )

    const [participantMetrics, moveEvents] = roomIds.length
      ? await Promise.all([
          prisma.mahaLilahParticipant.findMany({
            where: {
              roomId: {
                in: roomIds
              }
            },
            select: {
              roomId: true,
              role: true,
              gameIntention: true,
              therapistSummary: true,
              consentAcceptedAt: true,
              invite: {
                select: {
                  sentAt: true
                }
              }
            }
          }),
          prisma.mahaLilahMove.findMany({
            where: {
              roomId: {
                in: roomIds
              }
            },
            select: {
              createdAt: true
            }
          })
        ])
      : [[], []]

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

    const playerParticipants = participantMetrics.filter(
      (participant) => participant.role === MahaLilahParticipantRole.PLAYER
    )

    const summaryParticipants = participantMetrics.filter((participant) => {
      const room = roomById.get(participant.roomId)
      if (!room) return false
      if (participant.role === MahaLilahParticipantRole.PLAYER) return true
      return (
        participant.role === MahaLilahParticipantRole.THERAPIST &&
        room.therapistPlays
      )
    })

    const intentionParticipants = participantMetrics.filter((participant) => {
      const room = roomById.get(participant.roomId)
      if (!room) return false

      // When therapist only conducts (does not play), therapist intention should not be counted.
      if (
        participant.role === MahaLilahParticipantRole.THERAPIST &&
        !room.therapistPlays
      ) {
        return false
      }
      return true
    })

    const consentsAcceptedCount = playerParticipants.filter((participant) =>
      Boolean(participant.consentAcceptedAt)
    ).length
    const consentsPendingCount = playerParticipants.filter((participant) =>
      !participant.consentAcceptedAt
    ).length
    const consentsTotalCount = consentsAcceptedCount + consentsPendingCount

    let startedRoomsCount = 0
    let totalDurationMs = 0
    let firstMoveDelayTotalMs = 0
    let firstMoveDelayRoomsCount = 0
    const startedRoomIds = new Set<string>()
    const roomDurationByRoomId = new Map<string, number>()
    for (const window of moveWindows) {
      const min = window._min.createdAt
      const max = window._max.createdAt
      if (!min || !max || window._count._all <= 0) {
        continue
      }
      startedRoomIds.add(window.roomId)
      startedRoomsCount += 1
      const roomDurationMs = Math.max(0, max.getTime() - min.getTime())
      totalDurationMs += roomDurationMs
      roomDurationByRoomId.set(window.roomId, roomDurationMs)

      const room = roomById.get(window.roomId)
      if (room) {
        firstMoveDelayTotalMs += Math.max(0, min.getTime() - room.createdAt.getTime())
        firstMoveDelayRoomsCount += 1
      }
    }

    const completionRatePercent = toPercent(completedRoomsCount, startedRoomsCount)
    const averageDurationMinutes =
      startedRoomsCount > 0 ? totalDurationMs / startedRoomsCount / 60000 : null
    const totalDurationMinutes = totalDurationMs / 60000
    const averageTimeToFirstMoveMinutes =
      firstMoveDelayRoomsCount > 0 ? firstMoveDelayTotalMs / firstMoveDelayRoomsCount / 60000 : null

    const abandonedRoomsCount = Array.from(startedRoomIds).reduce((sum, roomId) => {
      const room = roomById.get(roomId)
      if (!room) return sum
      return room.status === MahaLilahRoomStatus.COMPLETED ? sum : sum + 1
    }, 0)
    const abandonmentRatePercent = toPercent(abandonedRoomsCount, startedRoomsCount)

    const playersByRoom = new Map<
      string,
      Array<{
        roomId: string
        role: MahaLilahParticipantRole
        gameIntention: string | null
        therapistSummary: string | null
        consentAcceptedAt: Date | null
        invite: {
          sentAt: Date
        } | null
      }>
    >()
    for (const participant of playerParticipants) {
      const current = playersByRoom.get(participant.roomId) || []
      current.push(participant)
      playersByRoom.set(participant.roomId, current)
    }

    const summaryParticipantsByRoom = new Map<
      string,
      Array<{
        roomId: string
        role: MahaLilahParticipantRole
        gameIntention: string | null
        therapistSummary: string | null
        consentAcceptedAt: Date | null
        invite: {
          sentAt: Date
        } | null
      }>
    >()
    for (const participant of summaryParticipants) {
      const current = summaryParticipantsByRoom.get(participant.roomId) || []
      current.push(participant)
      summaryParticipantsByRoom.set(participant.roomId, current)
    }

    let consentLeadTimeMsTotal = 0
    let consentLeadTimeMeasuredCount = 0
    for (const participant of playerParticipants) {
      if (!participant.consentAcceptedAt || !participant.invite?.sentAt) continue
      consentLeadTimeMsTotal += Math.max(
        0,
        participant.consentAcceptedAt.getTime() - participant.invite.sentAt.getTime()
      )
      consentLeadTimeMeasuredCount += 1
    }
    const averageConsentLeadTimeMinutes =
      consentLeadTimeMeasuredCount > 0 ? consentLeadTimeMsTotal / consentLeadTimeMeasuredCount / 60000 : null

    const playersTotalCount = summaryParticipants.length
    const playersWithSummaryCount = summaryParticipants.filter((participant) =>
      Boolean(participant.therapistSummary?.trim())
    ).length
    const roomsWithSummaryCount = rooms.filter((room) => {
      const roomPlayers = summaryParticipantsByRoom.get(room.id) || []
      return roomPlayers.some((participant) => Boolean(participant.therapistSummary?.trim()))
    }).length

    const participantsTotalCount = intentionParticipants.length
    const participantsWithIntentionCount = intentionParticipants.filter((participant) =>
      Boolean(participant.gameIntention?.trim())
    ).length
    const startedParticipants = intentionParticipants.filter((participant) =>
      startedRoomIds.has(participant.roomId)
    )
    const startedParticipantsWithIntentionCount = startedParticipants.filter((participant) =>
      Boolean(participant.gameIntention?.trim())
    ).length

    const roomsWithAcceptedInviteCount = rooms.filter((room) =>
      room.invites.some((invite) => Boolean(invite.acceptedAt))
    ).length
    const roomsWithAcceptedConsentCount = rooms.filter((room) => {
      const roomPlayers = playersByRoom.get(room.id) || []
      return roomPlayers.some((participant) => Boolean(participant.consentAcceptedAt))
    }).length
    const roomsWithAiCount = rooms.filter((room) => room._count.aiReports > 0).length

    const therapeuticDensityPer10Moves = totalMoves > 0 ? (totalTherapyEntries / totalMoves) * 10 : 0
    const averageTimePerMoveMinutes = totalMoves > 0 ? totalDurationMs / 60000 / totalMoves : null
    const averageAiPerStartedRoom = startedRoomsCount > 0 ? totalAiReports / startedRoomsCount : 0

    type ModeKey = 'playsTogether' | 'notPlaying' | 'solo'
    const modeAccumulator: Record<
      ModeKey,
      {
        rooms: number
        completed: number
        started: number
        durationMs: number
        moves: number
      }
    > = {
      playsTogether: { rooms: 0, completed: 0, started: 0, durationMs: 0, moves: 0 },
      notPlaying: { rooms: 0, completed: 0, started: 0, durationMs: 0, moves: 0 },
      solo: { rooms: 0, completed: 0, started: 0, durationMs: 0, moves: 0 }
    }

    for (const room of rooms) {
      const mode: ModeKey = room.therapistSoloPlay
        ? 'solo'
        : room.therapistPlays
          ? 'playsTogether'
          : 'notPlaying'
      modeAccumulator[mode].rooms += 1
      modeAccumulator[mode].moves += room._count.moves
      if (room.status === MahaLilahRoomStatus.COMPLETED) {
        modeAccumulator[mode].completed += 1
      }
      if (startedRoomIds.has(room.id)) {
        modeAccumulator[mode].started += 1
        modeAccumulator[mode].durationMs += roomDurationByRoomId.get(room.id) || 0
      }
    }

    function buildModeComparison(mode: ModeKey) {
      const data = modeAccumulator[mode]
      return {
        rooms: data.rooms,
        completionPercent: toPercent(data.completed, data.rooms),
        averageDurationMinutes: data.started > 0 ? data.durationMs / data.started / 60000 : null,
        averageMoves: data.rooms > 0 ? data.moves / data.rooms : 0
      }
    }

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

    for (const participant of intentionParticipants) {
      const room = roomById.get(participant.roomId)
      if (!room) continue

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

    const roomCreationHeatmap = buildWeekHourHeatmap(
      rooms.map((room) => room.createdAt)
    )
    const movesHeatmap = buildWeekHourHeatmap(
      moveEvents.map((move) => move.createdAt)
    )

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
        intentionThemes,
        funnel: {
          created: totalRoomsCount,
          inviteAccepted: roomsWithAcceptedInviteCount,
          consentAccepted: roomsWithAcceptedConsentCount,
          started: startedRoomsCount,
          completed: completedRoomsCount,
          inviteAcceptedPercent: toPercent(roomsWithAcceptedInviteCount, totalRoomsCount),
          consentAcceptedPercent: toPercent(roomsWithAcceptedConsentCount, totalRoomsCount),
          startedPercent: toPercent(startedRoomsCount, totalRoomsCount),
          completedPercent: toPercent(completedRoomsCount, totalRoomsCount)
        },
        timeToFirstMove: {
          averageMinutes: averageTimeToFirstMoveMinutes,
          measuredRooms: firstMoveDelayRoomsCount
        },
        timeToConsent: {
          averageMinutes: averageConsentLeadTimeMinutes,
          measuredParticipants: consentLeadTimeMeasuredCount
        },
        abandonment: {
          count: abandonedRoomsCount,
          percent: abandonmentRatePercent,
          startedRooms: startedRoomsCount
        },
        therapeuticDensity: {
          entriesPer10Moves: therapeuticDensityPer10Moves
        },
        therapistSummaryCoverage: {
          players: {
            count: playersWithSummaryCount,
            total: playersTotalCount,
            percent: toPercent(playersWithSummaryCount, playersTotalCount)
          },
          sessions: {
            count: roomsWithSummaryCount,
            total: totalRoomsCount,
            percent: toPercent(roomsWithSummaryCount, totalRoomsCount)
          }
        },
        intentionCoverage: {
          players: {
            count: participantsWithIntentionCount,
            total: participantsTotalCount,
            percent: toPercent(participantsWithIntentionCount, participantsTotalCount)
          },
          startedPlayers: {
            count: startedParticipantsWithIntentionCount,
            total: startedParticipants.length,
            percent: toPercent(startedParticipantsWithIntentionCount, startedParticipants.length)
          }
        },
        aiEffectiveness: {
          sessionsWithAi: roomsWithAiCount,
          sessionsPercent: toPercent(roomsWithAiCount, totalRoomsCount),
          averagePerStartedRoom: averageAiPerStartedRoom
        },
        averageTimePerMoveMinutes,
        modeComparison: {
          playsTogether: buildModeComparison('playsTogether'),
          notPlaying: buildModeComparison('notPlaying'),
          solo: buildModeComparison('solo')
        },
        heatmaps: {
          roomCreation: roomCreationHeatmap,
          moves: movesHeatmap
        }
      }
    })
  } catch (error) {
    console.error('Erro ao carregar indicadores Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
