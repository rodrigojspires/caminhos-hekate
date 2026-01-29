import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { HOUSES } from '@hekate/mahalilah-core'

interface RouteParams {
  params: { roomId: string }
}

function formatHouseName(number: number) {
  const house = HOUSES[number - 1]
  return house ? `${number} (${house.title})` : String(number)
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        playerStates: true,
        moves: {
          orderBy: { createdAt: 'asc' },
          include: {
            participant: { include: { user: { select: { id: true, name: true, email: true } } } },
            therapyEntries: true,
            cardDraws: true
          }
        },
        cardDraws: true,
        aiReports: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (room.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'

    if (format === 'txt') {
      const lines: string[] = []
      lines.push(`Maha Lilah — Sessão ${room.code}`)
      lines.push(`Criada em: ${room.createdAt.toLocaleString('pt-BR')}`)
      lines.push(`Status: ${room.status}`)
      lines.push(`Participantes: ${room.participants.length}/${room.maxParticipants}`)
      lines.push('')
      lines.push('Participantes:')
      room.participants.forEach((participant) => {
        const label = participant.user.name || participant.user.email
        lines.push(`- ${label} (${participant.role})`)
      })
      lines.push('')
      lines.push('Resumo por jogador:')
      room.participants.forEach((participant) => {
        const label = participant.user.name || participant.user.email
        const state = room.playerStates.find((item) => item.participantId === participant.id)
        if (!state) {
          lines.push(`- ${label}: sem estado disponível`)
          return
        }
        const currentHouse = state.position + 1
        lines.push(
          `- ${label}: rolagens ${state.rollCountTotal}, até iniciar ${state.rollCountUntilStart}, casa atual ${formatHouseName(currentHouse)}${state.hasCompleted ? ' (concluiu)' : ''}`
        )
      })
      lines.push('')
      lines.push('Movimentos:')
      if (room.moves.length === 0) {
        lines.push('(sem movimentos)')
      } else {
        room.moves.forEach((move, index) => {
          const name = move.participant.user.name || move.participant.user.email
          const jumpText = move.appliedJumpFrom
            ? ` • Atalho ${move.appliedJumpFrom}→${move.appliedJumpTo}`
            : ''
          lines.push(
            `${index + 1}. ${name} • dado ${move.diceValue} • ${formatHouseName(
              move.fromPos
            )} → ${formatHouseName(move.toPos)}${jumpText}`
          )
          if (move.cardDraws.length > 0) {
            const cards = move.cardDraws.map((draw) => draw.cards.join(', ')).join(' | ')
            lines.push(`   Cartas: ${cards}`)
          }
          if (move.therapyEntries.length > 0) {
            move.therapyEntries.forEach((entry, idx) => {
              lines.push(`   Registro ${idx + 1}:`)
              if (entry.emotion) {
                lines.push(`     Emoção: ${entry.emotion}${entry.intensity ? ` (${entry.intensity}/10)` : ''}`)
              }
              if (entry.insight) lines.push(`     Insight: ${entry.insight}`)
              if (entry.body) lines.push(`     Corpo: ${entry.body}`)
              if (entry.microAction) lines.push(`     Micro-ação: ${entry.microAction}`)
            })
          }
        })
      }
      const standaloneDraws = room.cardDraws.filter((draw) => !draw.moveId)
      if (standaloneDraws.length > 0) {
        lines.push('')
        lines.push('Deck randômico (sem jogada):')
        standaloneDraws.forEach((draw) => {
          lines.push(`- ${draw.cards.join(', ')} • ${draw.createdAt.toLocaleString('pt-BR')}`)
        })
      }
      lines.push('')
      lines.push('Relatórios IA:')
      if (room.aiReports.length === 0) {
        lines.push('(nenhum relatório)')
      } else {
        room.aiReports.forEach((report, idx) => {
          lines.push(`${idx + 1}. ${report.kind} • ${report.createdAt.toLocaleString('pt-BR')}`)
          lines.push(report.content)
          lines.push('')
        })
      }

      const content = lines.join('\n')
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="mahalilah_${room.code}.txt"`
        }
      })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Erro ao exportar sessão Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
