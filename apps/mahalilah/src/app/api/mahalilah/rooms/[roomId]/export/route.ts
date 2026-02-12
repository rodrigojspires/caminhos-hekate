import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Prisma, prisma } from '@hekate/database'
import { HOUSES } from '@hekate/mahalilah-core'

interface RouteParams {
  params: { roomId: string }
}

export const dynamic = 'force-dynamic'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 44
const PAGE_TOP = 88
const PAGE_BOTTOM = 58

const roomExportInclude = Prisma.validator<Prisma.MahaLilahRoomInclude>()({
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
  cardDraws: {
    include: {
      drawnBy: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  },
  aiReports: {
    include: {
      participant: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  }
})

type ExportRoom = Prisma.MahaLilahRoomGetPayload<{ include: typeof roomExportInclude }>
type ExportPlayerState = {
  participantId: string
  position: number
  hasCompleted: boolean
  rollCountTotal: number
  rollCountUntilStart: number
}

function formatHouseName(number: number) {
  const house = HOUSES[number - 1]
  return house ? `${number} (${house.title})` : String(number)
}

function toPdfSafeText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function toFilenamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function wrapText(value: string, maxChars: number) {
  const text = toPdfSafeText(value)
  if (!text) return ['']
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function rgbFill(r: number, g: number, b: number) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`
}

function rgbStroke(r: number, g: number, b: number) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`
}

function toPdfY(topY: number) {
  return (PAGE_HEIGHT - topY).toFixed(2)
}

function drawRect(pageOps: string[], x: number, topY: number, width: number, height: number, color: [number, number, number]) {
  const bottomY = PAGE_HEIGHT - topY - height
  pageOps.push(rgbFill(color[0], color[1], color[2]))
  pageOps.push(`${x.toFixed(2)} ${bottomY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`)
}

function drawLine(pageOps: string[], x1: number, topY: number, x2: number, color: [number, number, number], width = 1) {
  pageOps.push(rgbStroke(color[0], color[1], color[2]))
  pageOps.push(`${width.toFixed(2)} w`)
  pageOps.push(`${x1.toFixed(2)} ${toPdfY(topY)} m ${x2.toFixed(2)} ${toPdfY(topY)} l S`)
}

function drawText(
  pageOps: string[],
  text: string,
  x: number,
  topY: number,
  options?: {
    font?: 'F1' | 'F2'
    size?: number
    color?: [number, number, number]
  }
) {
  const safe = escapePdfText(toPdfSafeText(text))
  const font = options?.font ?? 'F1'
  const size = options?.size ?? 11
  const color = options?.color ?? [0.08, 0.12, 0.16]

  pageOps.push('BT')
  pageOps.push(`/${font} ${size.toFixed(2)} Tf`)
  pageOps.push(rgbFill(color[0], color[1], color[2]))
  pageOps.push(`${x.toFixed(2)} ${toPdfY(topY)} Td`)
  pageOps.push(`(${safe}) Tj`)
  pageOps.push('ET')
}

function formatDate(date: Date) {
  return date.toLocaleString('pt-BR')
}

function formatRoomStatus(status: string) {
  if (status === 'ACTIVE') return 'Ativa'
  if (status === 'CLOSED') return 'Encerrada'
  if (status === 'COMPLETED') return 'Concluida'
  return status
}

function formatPlanType(planType: string | null) {
  if (planType === 'SINGLE_SESSION') return 'Sessao avulsa'
  if (planType === 'SUBSCRIPTION') return 'Assinatura ilimitada'
  if (planType === 'SUBSCRIPTION_LIMITED') return 'Assinatura limitada'
  return planType || '-'
}

function formatParticipantRole(role: string) {
  if (role === 'THERAPIST') return 'Terapeuta'
  if (role === 'PLAYER') return 'Assistido'
  return role
}

function formatReportKind(kind: string) {
  if (kind === 'TIP') return 'Ajuda da IA'
  if (kind === 'FINAL') return 'Relatorio final'
  return kind
}

function repairPtBrMojibake(value: string) {
  let fixed = value

  // Correcoes comuns de texto UTF-8 mal decodificado para PT-BR
  if (/[ÃÂâ]/.test(fixed)) {
    const utf8Candidate = Buffer.from(fixed, 'latin1').toString('utf8')
    if (utf8Candidate && !/[\uFFFD]/.test(utf8Candidate)) {
      fixed = utf8Candidate
    }
  }

  // Correcoes pontuais observadas em alguns relatorios
  fixed = fixed
    .replace(/Œ/g, 'ê')
    .replace(/Ø/g, 'é')
    .replace(/ª/g, 'ã')

  return fixed.normalize('NFC')
}

function extractAiReportText(content: string) {
  const raw = (content || '').trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed === 'string') {
      return repairPtBrMojibake(parsed)
    }

    if (parsed && typeof parsed === 'object') {
      const text =
        typeof (parsed as { text?: unknown }).text === 'string'
          ? (parsed as { text: string }).text
          : typeof (parsed as { content?: unknown }).content === 'string'
            ? (parsed as { content: string }).content
            : ''

      if (text) return repairPtBrMojibake(text)
    }
  } catch {
    // Se nao for JSON, segue com o proprio conteudo.
  }

  return repairPtBrMojibake(raw)
}

function buildPdf(room: ExportRoom) {
  const pages: string[][] = []

  const totalMoves = room.moves.length
  const totalTherapyEntries = room.moves.reduce((sum, move) => sum + move.therapyEntries.length, 0)
  const totalDeckDrawsFromMoves = room.moves.reduce((sum, move) => sum + move.cardDraws.length, 0)
  const totalStandaloneDeckDraws = room.cardDraws.filter((draw) => !draw.moveId).length
  const totalDeckDraws = totalDeckDrawsFromMoves + totalStandaloneDeckDraws
  const totalTips = room.aiReports.filter((report) => report.kind === 'TIP').length
  const totalFinalReports = room.aiReports.filter((report) => report.kind === 'FINAL').length

  const stateByParticipant = new Map<string, ExportPlayerState>(
    room.playerStates.map((state) => [state.participantId, state as ExportPlayerState])
  )

  const coverPage: string[] = []
  pages.push(coverPage)

  drawRect(coverPage, 0, 0, PAGE_WIDTH, 190, [0.10, 0.26, 0.31])
  drawRect(coverPage, 0, 190, PAGE_WIDTH, 4, [0.83, 0.68, 0.39])
  drawText(coverPage, 'Maha Lilah', 52, 84, { font: 'F2', size: 30, color: [1, 1, 1] })
  drawText(coverPage, 'Relatorio de Sessao', 52, 118, { font: 'F2', size: 18, color: [0.91, 0.95, 0.97] })
  drawText(coverPage, `Sala ${room.code}`, 52, 150, { font: 'F1', size: 12, color: [0.91, 0.95, 0.97] })
  drawText(coverPage, `Gerado em ${formatDate(new Date())}`, 52, 170, { font: 'F1', size: 11, color: [0.91, 0.95, 0.97] })

  drawText(coverPage, 'Resumo rapido', 52, 236, { font: 'F2', size: 18, color: [0.10, 0.26, 0.31] })
  drawLine(coverPage, 52, 246, PAGE_WIDTH - 52, [0.75, 0.80, 0.83], 1.2)

  const coverCards = [
    { label: 'Participantes', value: `${room.participants.length}/${room.maxParticipants}` },
    { label: 'Jogadas', value: String(totalMoves) },
    { label: 'Registros terapeuticos', value: String(totalTherapyEntries) },
    { label: 'Relatorios IA', value: String(room.aiReports.length) }
  ]

  coverCards.forEach((card, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 52 + column * 248
    const topY = 270 + row * 98
    drawRect(coverPage, x, topY, 220, 80, [0.95, 0.97, 0.98])
    drawText(coverPage, card.label, x + 14, topY + 28, { font: 'F1', size: 10, color: [0.33, 0.40, 0.45] })
    drawText(coverPage, card.value, x + 14, topY + 58, { font: 'F2', size: 24, color: [0.10, 0.26, 0.31] })
  })

  drawText(
    coverPage,
    `Status da sala: ${formatRoomStatus(room.status)}  |  Trial: ${room.isTrial ? 'Sim' : 'Nao'}  |  Criada em ${formatDate(room.createdAt)}`,
    52,
    500,
    { font: 'F1', size: 11, color: [0.26, 0.33, 0.38] }
  )
  drawText(
    coverPage,
    'Este documento consolida a sessao com participantes, timeline de jogadas, deck randomico e relatorios de IA.',
    52,
    528,
    { font: 'F1', size: 10, color: [0.33, 0.40, 0.45] }
  )

  let currentPage: string[] = []
  let cursorY = PAGE_TOP
  const bodyMaxY = PAGE_HEIGHT - PAGE_BOTTOM

  const startBodyPage = (title?: string) => {
    currentPage = []
    pages.push(currentPage)
    drawRect(currentPage, 0, 0, PAGE_WIDTH, 44, [0.95, 0.97, 0.98])
    drawText(currentPage, `Maha Lilah | Sala ${room.code}`, MARGIN_LEFT, 28, {
      font: 'F2',
      size: 11,
      color: [0.10, 0.26, 0.31]
    })
    drawText(currentPage, formatDate(new Date()), PAGE_WIDTH - MARGIN_RIGHT - 140, 28, {
      font: 'F1',
      size: 9,
      color: [0.38, 0.44, 0.49]
    })
    cursorY = PAGE_TOP
    if (title) {
      addSectionTitle(title)
    }
  }

  const ensureSpace = (height: number) => {
    if (cursorY + height > bodyMaxY) {
      startBodyPage()
    }
  }

  const addSectionTitle = (title: string) => {
    ensureSpace(36)
    drawText(currentPage, title, MARGIN_LEFT, cursorY, {
      font: 'F2',
      size: 16,
      color: [0.10, 0.26, 0.31]
    })
    cursorY += 20
    drawLine(currentPage, MARGIN_LEFT, cursorY + 2, PAGE_WIDTH - MARGIN_RIGHT, [0.79, 0.84, 0.87], 1)
    cursorY += 14
  }

  const addParagraph = (value: string, options?: { font?: 'F1' | 'F2'; size?: number; indent?: number; color?: [number, number, number] }) => {
    const size = options?.size ?? 11
    const lineHeight = Math.max(14, size + 4)
    const indent = options?.indent ?? 0
    const textWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - indent
    const maxChars = Math.max(34, Math.floor(textWidth / (size * 0.54)))
    const lines = wrapText(value, maxChars)

    lines.forEach((line) => {
      ensureSpace(lineHeight)
      drawText(currentPage, line, MARGIN_LEFT + indent, cursorY, {
        font: options?.font ?? 'F1',
        size,
        color: options?.color ?? [0.09, 0.13, 0.17]
      })
      cursorY += lineHeight
    })
  }

  const addSpacer = (height = 8) => {
    ensureSpace(height)
    cursorY += height
  }

  startBodyPage('Sumario')
  const sumarioItems = [
    '1. Visao geral da sessao',
    '2. Participantes e progresso',
    '3. Timeline de jogadas',
    '4. Deck randomico',
    '5. Relatorios de IA'
  ]
  sumarioItems.forEach((item) => addParagraph(item, { size: 12 }))
  addSpacer(10)
  addParagraph(`Total de jogadas: ${totalMoves}`)
  addParagraph(`Total de registros terapeuticos: ${totalTherapyEntries}`)
  addParagraph(`Total de cartas reveladas: ${totalDeckDraws}`)
  addParagraph(`Relatorios IA: ${room.aiReports.length} (Ajudas: ${totalTips} | Finais: ${totalFinalReports})`)

  addSpacer(20)
  addSectionTitle('1. Visao geral da sessao')
  addParagraph(`Codigo da sala: ${room.code}`)
  addParagraph(`Criada em: ${formatDate(room.createdAt)}`)
  addParagraph(`Status atual: ${formatRoomStatus(room.status)}`)
  addParagraph(`Participantes: ${room.participants.length} de ${room.maxParticipants}`)
  addParagraph(`Plano: ${formatPlanType(room.planType)} | Sala trial: ${room.isTrial ? 'Sim' : 'Nao'}`)
  addParagraph(`Terapeuta joga: ${room.therapistPlays ? 'Sim' : 'Nao'}`)
  addParagraph(`Intencao bloqueada para jogadores: ${room.playerIntentionLocked ? 'Sim' : 'Nao'}`)

  addSpacer(16)
  addSectionTitle('2. Participantes e progresso')
  if (room.participants.length === 0) {
    addParagraph('Nenhum participante encontrado para esta sessao.')
  } else {
    room.participants.forEach((participant, index) => {
      const label = participant.user.name || participant.user.email
      const state = stateByParticipant.get(participant.id)
      addParagraph(`${index + 1}. ${label}`, { font: 'F2', size: 12 })
      addParagraph(`Papel: ${formatParticipantRole(participant.role)}`, { indent: 14 })
      addParagraph(
        `Consentimento: ${participant.consentAcceptedAt ? formatDate(participant.consentAcceptedAt) : 'Nao aceito'}`,
        { indent: 14 }
      )
      addParagraph(
        `Intencao de jogo: ${participant.gameIntention || 'Nao informada'}`,
        { indent: 14 }
      )
      if (!state) {
        addParagraph('Estado: sem dados de progresso.', { indent: 14 })
      } else {
        addParagraph(`Casa atual: ${formatHouseName(state.position + 1)}`, { indent: 14 })
        addParagraph(`Rolagens totais: ${state.rollCountTotal}`, { indent: 14 })
        addParagraph(`Rolagens ate iniciar: ${state.rollCountUntilStart}`, { indent: 14 })
        addParagraph(`Concluiu partida: ${state.hasCompleted ? 'Sim' : 'Nao'}`, { indent: 14 })
      }
      addSpacer(6)
    })
  }

  addSpacer(16)
  addSectionTitle('3. Timeline de jogadas')
  if (room.moves.length === 0) {
    addParagraph('Ainda nao ha jogadas registradas nesta sala.')
  } else {
    room.moves.forEach((move, index) => {
      const name = move.participant.user.name || move.participant.user.email
      const jumpText = move.appliedJumpFrom
        ? ` | atalho ${move.appliedJumpFrom} -> ${move.appliedJumpTo}`
        : ''
      addParagraph(
        `${index + 1}. ${formatDate(move.createdAt)} | ${name} | dado ${move.diceValue} | ${formatHouseName(
          move.fromPos
        )} -> ${formatHouseName(move.toPos)}${jumpText}`,
        { font: 'F2', size: 10 }
      )

      if (move.cardDraws.length > 0) {
        addParagraph(`Cartas da jogada: ${move.cardDraws.map((draw) => draw.cards.join(', ')).join(' | ')}`, {
          indent: 14,
          size: 10
        })
      }

      if (move.therapyEntries.length > 0) {
        move.therapyEntries.forEach((entry, therapyIndex) => {
          addParagraph(`Registro terapeutico ${therapyIndex + 1}:`, {
            indent: 14,
            size: 10,
            font: 'F2'
          })
          if (entry.emotion) {
            addParagraph(
              `Emocao: ${entry.emotion}${entry.intensity ? ` (${entry.intensity}/10)` : ''}`,
              { indent: 28, size: 10 }
            )
          }
          if (entry.insight) addParagraph(`Insight: ${entry.insight}`, { indent: 28, size: 10 })
          if (entry.body) addParagraph(`Corpo: ${entry.body}`, { indent: 28, size: 10 })
          if (entry.microAction) addParagraph(`Micro-acao: ${entry.microAction}`, { indent: 28, size: 10 })
        })
      }
      addSpacer(4)
    })
  }

  addSpacer(16)
  addSectionTitle('4. Deck randomico')
  const standaloneDraws = room.cardDraws.filter((draw) => !draw.moveId)
  if (standaloneDraws.length === 0) {
    addParagraph('Nao houve tiragem randomica fora da timeline de jogadas.')
  } else {
    standaloneDraws.forEach((draw, index) => {
      const actor = draw.drawnBy?.user?.name || draw.drawnBy?.user?.email || 'Sem identificacao'
      addParagraph(
        `${index + 1}. ${formatDate(draw.createdAt)} | ${actor} | cartas: ${draw.cards.join(', ')}`,
        { size: 10 }
      )
    })
  }

  addSpacer(16)
  addSectionTitle('5. Relatorios de IA')
  if (room.aiReports.length === 0) {
    addParagraph('Nenhum relatorio de IA foi emitido nesta sessao.')
  } else {
    room.aiReports.forEach((report, index) => {
      const owner = report.participant?.user?.name || report.participant?.user?.email || 'Sessao'
      addParagraph(
        `${index + 1}. ${formatReportKind(report.kind)} | ${formatDate(report.createdAt)} | alvo: ${owner}`,
        { font: 'F2', size: 10 }
      )

      const reportText = extractAiReportText(report.content)
      const contentLines = reportText
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean)

      if (contentLines.length === 0) {
        addParagraph('Conteudo vazio.', { indent: 14, size: 10 })
      } else {
        contentLines.forEach((line) => addParagraph(line, { indent: 14, size: 10 }))
      }
      addSpacer(6)
    })
  }

  const totalPages = pages.length
  pages.forEach((page, index) => {
    drawLine(page, MARGIN_LEFT, PAGE_HEIGHT - 36, PAGE_WIDTH - MARGIN_RIGHT, [0.87, 0.90, 0.92], 0.8)
    drawText(
      page,
      `Pagina ${index + 1} de ${totalPages}`,
      PAGE_WIDTH - MARGIN_RIGHT - 88,
      PAGE_HEIGHT - 20,
      { font: 'F1', size: 9, color: [0.45, 0.50, 0.54] }
    )
  })

  const pageStreams = pages.map((ops) => ops.join('\n'))
  const objectMap: Record<number, string> = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    3: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    4: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  }

  const pageObjectIds: number[] = []
  let nextObjectId = 5

  pageStreams.forEach((stream) => {
    const pageObjectId = nextObjectId++
    const contentObjectId = nextObjectId++
    pageObjectIds.push(pageObjectId)
    objectMap[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(
      2
    )} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`

    objectMap[contentObjectId] = `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`
  })

  objectMap[2] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] >>`

  const maxObjectId = nextObjectId - 1
  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
  const offsets: number[] = new Array(maxObjectId + 1).fill(0)

  for (let id = 1; id <= maxObjectId; id += 1) {
    const body = objectMap[id]
    if (!body) continue
    offsets[id] = Buffer.byteLength(pdf, 'binary')
    pdf += `${id} 0 obj\n${body}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += `xref\n0 ${maxObjectId + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let id = 1; id <= maxObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'binary')
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      include: roomExportInclude
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    const requesterParticipant = room.participants.find(
      (participant) => participant.userId === session.user.id
    )
    const isOwner = room.createdByUserId === session.user.id

    if (!isOwner && !requesterParticipant) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'pdf').toLowerCase()
    const requestedParticipantId = url.searchParams.get('participantId')

    if (format !== 'pdf') {
      return NextResponse.json({ error: 'Formato nao suportado. Use format=pdf.' }, { status: 400 })
    }

    let scopedParticipantId: string | null = null
    const therapistParticipant =
      room.participants.find((participant) => participant.role === 'THERAPIST') || null

    if (room.therapistSoloPlay) {
      if (!isOwner) {
        return NextResponse.json(
          { error: 'No modo visualizador, apenas o terapeuta pode exportar o PDF.' },
          { status: 403 }
        )
      }
      scopedParticipantId = therapistParticipant?.id || requesterParticipant?.id || null
    }

    if (!scopedParticipantId && isOwner) {
      if (requestedParticipantId) {
        const participantExists = room.participants.some(
          (participant) => participant.id === requestedParticipantId
        )
        if (!participantExists) {
          return NextResponse.json(
            { error: 'Jogador informado para exportação não pertence a esta sala.' },
            { status: 400 }
          )
        }
        scopedParticipantId = requestedParticipantId
      }
    } else if (!scopedParticipantId) {
      scopedParticipantId = requesterParticipant?.id || null
    }

    const exportRoom = scopedParticipantId
      ? ({
          ...room,
          participants: room.participants.filter(
            (participant) => participant.id === scopedParticipantId
          ),
          playerStates: room.playerStates.filter(
            (state) => state.participantId === scopedParticipantId
          ),
          moves: room.moves
            .filter((move) => move.participantId === scopedParticipantId)
            .map((move) => ({
              ...move,
              therapyEntries: move.therapyEntries.filter(
                (entry) => entry.participantId === scopedParticipantId
              ),
              cardDraws: move.cardDraws.filter(
                (draw) => draw.drawnById === scopedParticipantId
              )
            })),
          cardDraws: room.cardDraws.filter(
            (draw) => draw.moveId === null && draw.drawnById === scopedParticipantId
          ),
          aiReports: room.aiReports.filter(
            (report) => report.participantId === scopedParticipantId
          )
        } as ExportRoom)
      : room

    const pdfBuffer = buildPdf(exportRoom)

    const targetParticipant = scopedParticipantId
      ? room.participants.find((participant) => participant.id === scopedParticipantId)
      : null
    const participantSuffix = targetParticipant
      ? `_${toFilenamePart(targetParticipant.user.name || targetParticipant.user.email)}`
      : ''

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mahalilah_${room.code}${participantSuffix}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength)
      }
    })
  } catch (error) {
    console.error('Erro ao exportar sessão Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
