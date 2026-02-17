import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Prisma, prisma } from '@hekate/database'
import { HOUSES, getHouseByNumber } from '@hekate/mahalilah-core'
import { HOUSE_MEANINGS } from '@/lib/mahalilah/house-meanings'
import { HOUSE_POLARITIES } from '@/lib/mahalilah/house-polarities'
import { HOUSE_THERAPEUTIC_TEXTS } from '@/lib/mahalilah/house-therapeutic-texts'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface RouteParams {
  params: { roomId: string }
}

export const dynamic = 'force-dynamic'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 44
const PAGE_TOP = 88
const PAGE_BOTTOM = 94

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
      cardDraws: {
        include: {
          card: {
            include: {
              deck: true
            }
          }
        }
      }
    }
  },
  cardDraws: {
    include: {
      card: {
        include: {
          deck: true
        }
      },
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

type DeckInlineImageSlot = {
  pageIndex: number
  x: number
  topY: number
  width: number
  height: number
  cardNumber: number | null
  card: NonNullable<ExportRoom['moves'][number]['cardDraws'][number]['card']> | null
}

type BuildPdfResult = {
  buffer: Buffer
  deckImageSlots: DeckInlineImageSlot[]
}

type BuildPdfOptions = {
  therapistName: string
  playerName: string
  focusParticipantId: string | null
  generatedAt: Date
}

function formatHouseName(number: number) {
  const house = HOUSES[number - 1]
  return house ? `${number} (${house.title})` : String(number)
}

function toPdfSafeText(value: string) {
  return (value || '')
    .normalize('NFC')
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

function drawCenteredText(
  pageOps: string[],
  text: string,
  topY: number,
  options?: {
    font?: 'F1' | 'F2'
    size?: number
    color?: [number, number, number]
  }
) {
  const safeText = toPdfSafeText(text)
  const size = options?.size ?? 11
  const estimatedWidth = safeText.length * size * 0.52
  const x = Math.max(MARGIN_LEFT, (PAGE_WIDTH - estimatedWidth) / 2)
  drawText(pageOps, text, x, topY, options)
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
  if (kind === 'PROGRESS') return 'O Caminho ate agora'
  if (kind === 'FINAL') return 'Relatorio final'
  return kind
}

function isSafeSegment(value: string) {
  return /^[a-z0-9][a-z0-9_-]{1,79}$/i.test(value)
}

function getDeckImagesRoots() {
  const roots = new Set<string>()
  const configured = process.env.DECK_IMAGES_ROOT?.trim()
  if (configured) roots.add(configured)

  // Monorepo root (default local)
  roots.add(join(process.cwd(), 'apps', 'mahalilah', 'private_uploads', 'deck-images'))
  // When process cwd is already apps/mahalilah
  roots.add(join(process.cwd(), 'private_uploads', 'deck-images'))
  // Extra fallback for scripted runs
  roots.add(join(process.cwd(), '..', 'private_uploads', 'deck-images'))

  return Array.from(roots)
}

function normalizeImageExtension(value: string | null | undefined) {
  return (value || '').replace(/^\./, '').toLowerCase()
}

function getCardImageExtensionCandidates(primary: string) {
  const defaults = ['png', 'jpg', 'jpeg']
  const preferred = normalizeImageExtension(primary)
  const candidates = preferred ? [preferred, ...defaults] : defaults
  return Array.from(new Set(candidates))
}

function inferPdfImageFormatFromExtension(extension: string) {
  if (extension === 'png') return 'png' as const
  if (extension === 'jpg' || extension === 'jpeg') return 'jpg' as const
  return null
}

function inferPdfImageFormatFromContentType(contentType: string | null) {
  const normalized = (contentType || '').toLowerCase()
  if (normalized.includes('image/png')) return 'png' as const
  if (normalized.includes('image/jpeg') || normalized.includes('image/jpg')) {
    return 'jpg' as const
  }
  return null
}

async function loadCardImageForPdf(
  card: NonNullable<ExportRoom['moves'][number]['cardDraws'][number]['card']>,
  requestOrigin: string
) {
  if (!card.deck?.imageDirectory || !isSafeSegment(card.deck.imageDirectory)) {
    return null
  }

  const extensionCandidates = getCardImageExtensionCandidates(card.deck.imageExtension)
  const roots = getDeckImagesRoots()

  for (const extension of extensionCandidates) {
    const format = inferPdfImageFormatFromExtension(extension)
    if (!format) continue
    const filename = `${card.cardNumber}.${extension}`
    for (const root of roots) {
      try {
        const filePath = join(root, card.deck.imageDirectory, filename)
        const bytes = await readFile(filePath)
        return { bytes, format }
      } catch {
        // try next root/extension
      }
    }
  }

  // Fallback to local HTTP route when filesystem root is uncertain.
  for (const extension of extensionCandidates) {
    const formatFromExtension = inferPdfImageFormatFromExtension(extension)
    if (!formatFromExtension) continue
    try {
      const imageUrl = `${requestOrigin}/api/mahalilah/decks/${card.deck.id}/images/${card.cardNumber}.${extension}`
      const response = await fetch(imageUrl, { cache: 'no-store' })
      if (!response.ok) continue
      const arrayBuffer = await response.arrayBuffer()
      const bytes = Buffer.from(arrayBuffer)
      const format =
        inferPdfImageFormatFromContentType(response.headers.get('content-type')) ||
        formatFromExtension
      return { bytes, format }
    } catch {
      // try next extension
    }
  }

  return null
}

function extractAiReportText(content: string) {
  const raw = (content || '').trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed === 'string') {
      return parsed.normalize('NFC')
    }

    if (parsed && typeof parsed === 'object') {
      const text =
        typeof (parsed as { text?: unknown }).text === 'string'
          ? (parsed as { text: string }).text
          : typeof (parsed as { content?: unknown }).content === 'string'
            ? (parsed as { content: string }).content
            : ''

      if (text) return text.normalize('NFC')
    }
  } catch {
    // Se nao for JSON, segue com o proprio conteudo.
  }

  return raw.normalize('NFC')
}

function extractProgressInterval(content: string) {
  const raw = (content || '').trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const intervalStart =
      typeof (parsed as { intervalStart?: unknown }).intervalStart === 'number'
        ? (parsed as { intervalStart: number }).intervalStart
        : null
    const intervalEnd =
      typeof (parsed as { intervalEnd?: unknown }).intervalEnd === 'number'
        ? (parsed as { intervalEnd: number }).intervalEnd
        : null

    if (
      intervalStart !== null &&
      intervalEnd !== null &&
      Number.isFinite(intervalStart) &&
      Number.isFinite(intervalEnd)
    ) {
      return `Jogadas ${intervalStart} a ${intervalEnd}`
    }
  } catch {
    // Ignora quando o conteudo nao for JSON estruturado.
  }

  return null
}

function extractTipData(content: string) {
  const parsedText = extractAiReportText(content)
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object') {
      return { text: parsedText, turnNumber: null as number | null }
    }
    const turnNumber =
      typeof (parsed as { turnNumber?: unknown }).turnNumber === 'number'
        ? (parsed as { turnNumber: number }).turnNumber
        : null
    return { text: parsedText, turnNumber }
  } catch {
    return { text: parsedText, turnNumber: null as number | null }
  }
}

function extractProgressData(content: string) {
  const parsedText = extractAiReportText(content)
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object') {
      return {
        text: parsedText,
        intervalStart: null as number | null,
        intervalEnd: null as number | null
      }
    }

    const intervalStart =
      typeof (parsed as { intervalStart?: unknown }).intervalStart === 'number'
        ? (parsed as { intervalStart: number }).intervalStart
        : null
    const intervalEnd =
      typeof (parsed as { intervalEnd?: unknown }).intervalEnd === 'number'
        ? (parsed as { intervalEnd: number }).intervalEnd
        : null

    return {
      text: parsedText,
      intervalStart,
      intervalEnd
    }
  } catch {
    return {
      text: parsedText,
      intervalStart: null as number | null,
      intervalEnd: null as number | null
    }
  }
}

function isPostStartMove(move: {
  fromPos: number
  toPos: number
  diceValue: number
}) {
  return !(move.fromPos === 68 && move.toPos === 68 && move.diceValue !== 6)
}

function getHouseExplanationLines(houseNumber: number) {
  const house = getHouseByNumber(houseNumber)
  const houseMeaning = HOUSE_MEANINGS[houseNumber]
  const polarity = HOUSE_POLARITIES[houseNumber]
  const therapeutic = HOUSE_THERAPEUTIC_TEXTS[houseNumber]

  const lines: string[] = []
  lines.push(`Casa: ${formatHouseName(houseNumber)}`)
  lines.push(`Descricao base: ${house?.description || '-'}`)
  lines.push(`Significado ampliado: ${houseMeaning || '-'}`)
  lines.push(`Lado luz - palavras-chave: ${polarity?.lightKeywords || '-'}`)
  lines.push(`Lado luz - sintese: ${polarity?.lightSummary || '-'}`)
  lines.push(`Lado sombra - palavras-chave: ${polarity?.shadowKeywords || '-'}`)
  lines.push(`Lado sombra - sintese: ${polarity?.shadowSummary || '-'}`)
  lines.push(`Texto terapeutico: ${therapeutic?.text || '-'}`)
  lines.push(`Pergunta terapeutica: ${therapeutic?.question || '-'}`)
  return lines
}

function formatDurationBetween(startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) return '-'
  const diffMs = endDate.getTime() - startDate.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return '-'

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}min`
}

function buildPdf(room: ExportRoom, options: BuildPdfOptions): BuildPdfResult {
  const pages: string[][] = []
  const deckImageSlots: DeckInlineImageSlot[] = []

  const focusParticipant =
    (options.focusParticipantId
      ? room.participants.find((participant) => participant.id === options.focusParticipantId)
      : null) ||
    room.participants.find((participant) => participant.role !== 'THERAPIST') ||
    room.participants[0] ||
    null
  const focusParticipantId = focusParticipant?.id || null

  const participantMoves = focusParticipantId
    ? room.moves.filter((move) => move.participantId === focusParticipantId)
    : room.moves
  const participantState = focusParticipantId
    ? room.playerStates.find((state) => state.participantId === focusParticipantId) || null
    : room.playerStates[0] || null
  const participantReports = focusParticipantId
    ? room.aiReports.filter((report) => report.participantId === focusParticipantId)
    : room.aiReports
  const standaloneDraws = focusParticipantId
    ? room.cardDraws.filter((draw) => draw.moveId === null && draw.drawnByParticipantId === focusParticipantId)
    : room.cardDraws.filter((draw) => draw.moveId === null)

  const totalMoves = participantMoves.length
  const totalTherapyEntries = participantMoves.reduce((sum, move) => sum + move.therapyEntries.length, 0)
  const totalCardDraws = participantMoves.reduce((sum, move) => sum + move.cardDraws.length, 0) + standaloneDraws.length
  const tipReports = participantReports.filter((report) => report.kind === 'TIP')
  const progressReports = participantReports.filter((report) => report.kind === 'PROGRESS')
  const finalReports = participantReports
    .filter((report) => report.kind === 'FINAL')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const firstPostStartMove =
    participantMoves.find((move) => isPostStartMove(move)) || null
  const lastMove = participantMoves.length ? participantMoves[participantMoves.length - 1] : null
  const startDate = firstPostStartMove?.createdAt ? new Date(firstPostStartMove.createdAt) : null
  const endDate = lastMove?.createdAt ? new Date(lastMove.createdAt) : null
  const durationLabel = formatDurationBetween(startDate, endDate)
  const currentHouseNumber = participantState ? participantState.position + 1 : 68
  const currentHouse = getHouseByNumber(currentHouseNumber)

  const tipByTurn = new Map<number, Array<{ text: string; createdAt: Date }>>()
  const extraTips: Array<{ text: string; createdAt: Date; turnNumber: number | null }> = []
  const existingTurnNumbers = new Set(participantMoves.map((move) => move.turnNumber))
  tipReports.forEach((report) => {
    const parsed = extractTipData(report.content)
    if (
      parsed.turnNumber === null ||
      !Number.isFinite(parsed.turnNumber) ||
      !existingTurnNumbers.has(parsed.turnNumber)
    ) {
      extraTips.push({
        text: parsed.text,
        createdAt: new Date(report.createdAt),
        turnNumber: parsed.turnNumber
      })
      return
    }
    const current = tipByTurn.get(parsed.turnNumber) || []
    current.push({
      text: parsed.text,
      createdAt: new Date(report.createdAt)
    })
    tipByTurn.set(parsed.turnNumber, current)
  })

  const progressByIntervalEnd = new Map<
    number,
    Array<{ id: string; text: string; intervalStart: number | null; intervalEnd: number | null; createdAt: Date }>
  >()
  const extraProgressReports: Array<{
    id: string
    text: string
    intervalStart: number | null
    intervalEnd: number | null
    createdAt: Date
  }> = []
  progressReports.forEach((report) => {
    const parsed = extractProgressData(report.content)
    if (parsed.intervalEnd === null || !Number.isFinite(parsed.intervalEnd)) {
      extraProgressReports.push({
        id: report.id,
        text: parsed.text,
        intervalStart: parsed.intervalStart,
        intervalEnd: parsed.intervalEnd,
        createdAt: new Date(report.createdAt)
      })
      return
    }
    const current = progressByIntervalEnd.get(parsed.intervalEnd) || []
    current.push({
      id: report.id,
      text: parsed.text,
      intervalStart: parsed.intervalStart,
      intervalEnd: parsed.intervalEnd,
      createdAt: new Date(report.createdAt)
    })
    progressByIntervalEnd.set(parsed.intervalEnd, current)
  })

  const pathHouses: number[] = []
  if (participantMoves.length > 0) {
    pathHouses.push(participantMoves[0].fromPos)
    participantMoves.forEach((move) => {
      if (move.appliedJumpFrom !== null && move.appliedJumpTo !== null) {
        pathHouses.push(move.appliedJumpFrom, move.appliedJumpTo)
      } else {
        pathHouses.push(move.toPos)
      }
    })
  }

  const recurringMap = new Map<number, number>()
  pathHouses.forEach((houseNumber) => {
    if (houseNumber >= 68 && houseNumber <= 71) {
      return
    }
    recurringMap.set(houseNumber, (recurringMap.get(houseNumber) || 0) + 1)
  })
  const recurringHouses = Array.from(recurringMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const coverPage: string[] = []
  pages.push(coverPage)

  const coverHeaderTop = 280
  const coverHeaderHeight = 236
  drawRect(coverPage, 0, coverHeaderTop, PAGE_WIDTH, coverHeaderHeight, [0.10, 0.26, 0.31])
  drawRect(coverPage, 0, coverHeaderTop + coverHeaderHeight, PAGE_WIDTH, 4, [0.83, 0.68, 0.39])
  drawCenteredText(coverPage, 'Maha Lilah Online', coverHeaderTop + 56, {
    font: 'F2',
    size: 30,
    color: [1, 1, 1]
  })
  drawCenteredText(coverPage, 'Relatorio de Sessao', coverHeaderTop + 88, {
    font: 'F2',
    size: 18,
    color: [0.92, 0.95, 0.97]
  })

  const headerRoomLine =
    `Sala ${room.code} - Status: ${formatRoomStatus(room.status)} - criada em ${formatDate(room.createdAt)}` +
    (room.isTrial ? ' - Trial' : '')
  drawCenteredText(coverPage, headerRoomLine, coverHeaderTop + 118, {
    font: 'F1',
    size: 11,
    color: [0.92, 0.95, 0.97]
  })
  drawCenteredText(coverPage, `Terapeuta: ${options.therapistName}`, coverHeaderTop + 140, {
    font: 'F1',
    size: 11,
    color: [0.92, 0.95, 0.97]
  })
  drawCenteredText(coverPage, `Nome do Jogador: ${options.playerName}`, coverHeaderTop + 162, {
    font: 'F1',
    size: 11,
    color: [0.92, 0.95, 0.97]
  })
  drawCenteredText(coverPage, `Gerado em ${formatDate(options.generatedAt)}`, coverHeaderTop + 184, {
    font: 'F1',
    size: 10,
    color: [0.92, 0.95, 0.97]
  })

  let currentPage: string[] = []
  let cursorY = PAGE_TOP
  const bodyMaxY = PAGE_HEIGHT - PAGE_BOTTOM

  const startBodyPage = (title?: string) => {
    currentPage = []
    pages.push(currentPage)
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
    ensureSpace(38)
    drawText(currentPage, title, MARGIN_LEFT, cursorY, {
      font: 'F2',
      size: 16,
      color: [0.10, 0.26, 0.31]
    })
    cursorY += 20
    drawLine(currentPage, MARGIN_LEFT, cursorY + 2, PAGE_WIDTH - MARGIN_RIGHT, [0.79, 0.84, 0.87], 1)
    cursorY += 14
  }

  const addParagraph = (
    value: string,
    options?: { font?: 'F1' | 'F2'; size?: number; indent?: number; color?: [number, number, number] }
  ) => {
    const size = options?.size ?? 11
    const lineHeight = Math.max(14, size + 4)
    const indent = options?.indent ?? 0
    const textWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - indent
    const maxChars = Math.max(30, Math.floor(textWidth / (size * 0.54)))
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

  const addMultilineParagraph = (value: string, options?: { indent?: number; size?: number; font?: 'F1' | 'F2' }) => {
    const lines = (value || '')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      addParagraph('Sem conteudo.', { indent: options?.indent ?? 0, size: options?.size ?? 10 })
      return
    }

    lines.forEach((line) =>
      addParagraph(line, {
        indent: options?.indent ?? 0,
        size: options?.size ?? 10,
        font: options?.font ?? 'F1'
      })
    )
  }

  const addSpacer = (height = 8) => {
    ensureSpace(height)
    cursorY += height
  }

  const addSummaryIndicatorCards = (
    items: Array<{
      label: string
      value: string
    }>
  ) => {
    if (items.length === 0) return

    const columns = 3
    const gapX = 10
    const gapY = 10
    const cardHeight = 56
    const contentWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
    const cardWidth = (contentWidth - gapX * (columns - 1)) / columns
    const rows = Math.ceil(items.length / columns)
    const totalHeight = rows * cardHeight + (rows - 1) * gapY
    const palette: Array<[number, number, number]> = [
      [0.90, 0.95, 0.99],
      [0.92, 0.96, 0.92],
      [0.98, 0.94, 0.90],
      [0.94, 0.93, 0.98],
      [0.90, 0.96, 0.95],
      [0.97, 0.93, 0.95]
    ]

    ensureSpace(totalHeight + 6)

    for (let row = 0; row < rows; row += 1) {
      const start = row * columns
      const rowItems = items.slice(start, start + columns)
      const offsetX =
        rowItems.length < columns
          ? ((columns - rowItems.length) * (cardWidth + gapX)) / 2
          : 0

      rowItems.forEach((item, colIndex) => {
        const cardX = MARGIN_LEFT + offsetX + colIndex * (cardWidth + gapX)
        const cardY = cursorY + row * (cardHeight + gapY)
        const color = palette[(start + colIndex) % palette.length]

        drawRect(currentPage, cardX, cardY, cardWidth, cardHeight, color)
        drawText(currentPage, item.label, cardX + 10, cardY + 18, {
          font: 'F2',
          size: 9,
          color: [0.15, 0.22, 0.28]
        })
        drawText(currentPage, item.value, cardX + 10, cardY + 40, {
          font: 'F2',
          size: 16,
          color: [0.08, 0.12, 0.16]
        })
      })
    }

    cursorY += totalHeight + 6
  }

  const addOverviewCards = (
    items: Array<{
      label: string
      value: string
    }>
  ) => {
    if (items.length === 0) return

    const columns = 2
    const gapX = 10
    const gapY = 10
    const paddingX = 10
    const contentWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
    const cardWidth = (contentWidth - gapX * (columns - 1)) / columns
    const labelSize = 9
    const labelLineHeight = 11
    const valueSize = 11
    const valueLineHeight = 13
    const labelChars = Math.max(14, Math.floor((cardWidth - paddingX * 2) / (labelSize * 0.54)))
    const valueChars = Math.max(18, Math.floor((cardWidth - paddingX * 2) / (valueSize * 0.54)))
    const palette: Array<[number, number, number]> = [
      [0.91, 0.95, 0.99],
      [0.93, 0.96, 0.92],
      [0.98, 0.95, 0.91],
      [0.95, 0.94, 0.98]
    ]

    const rowEntries: Array<{
      entries: Array<{ labelLines: string[]; valueLines: string[] }>
      rowHeight: number
    }> = []

    const rows = Math.ceil(items.length / columns)
    for (let row = 0; row < rows; row += 1) {
      const start = row * columns
      const rowItems = items.slice(start, start + columns)
      let rowHeight = 0
      const entries = rowItems.map((item) => {
        const labelLines = wrapText(item.label, labelChars)
        const valueLines = wrapText(item.value || '-', valueChars)
        const height = 10 + labelLines.length * labelLineHeight + 6 + valueLines.length * valueLineHeight + 10
        rowHeight = Math.max(rowHeight, height)
        return { labelLines, valueLines }
      })
      rowEntries.push({ entries, rowHeight })
    }

    const totalHeight =
      rowEntries.reduce((sum, row) => sum + row.rowHeight, 0) + Math.max(0, (rowEntries.length - 1) * gapY)
    ensureSpace(totalHeight + 6)

    let rowTop = cursorY
    rowEntries.forEach((rowData, rowIndex) => {
      const start = rowIndex * columns
      const offsetX =
        rowData.entries.length < columns
          ? ((columns - rowData.entries.length) * (cardWidth + gapX)) / 2
          : 0

      rowData.entries.forEach((entry, colIndex) => {
        const cardX = MARGIN_LEFT + offsetX + colIndex * (cardWidth + gapX)
        const color = palette[(start + colIndex) % palette.length]

        drawRect(currentPage, cardX, rowTop, cardWidth, rowData.rowHeight, color)

        let textY = rowTop + 16
        entry.labelLines.forEach((line) => {
          drawText(currentPage, line, cardX + paddingX, textY, {
            font: 'F2',
            size: labelSize,
            color: [0.15, 0.22, 0.28]
          })
          textY += labelLineHeight
        })

        textY += 3
        entry.valueLines.forEach((line) => {
          drawText(currentPage, line, cardX + paddingX, textY, {
            font: 'F1',
            size: valueSize,
            color: [0.08, 0.12, 0.16]
          })
          textY += valueLineHeight
        })
      })

      rowTop += rowData.rowHeight + gapY
    })

    cursorY += totalHeight + 6
  }

  const addCardWithSideText = (params: {
    card: NonNullable<ExportRoom['moves'][number]['cardDraws'][number]['card']> | null
    cards: number[]
    titlePrefix?: string
  }) => {
    const cardNumber = params.card?.cardNumber ?? params.cards[0] ?? null
    const imageX = MARGIN_LEFT + 16
    const imageWidth = 84
    const imageHeight = 120
    const textX = imageX + imageWidth + 14
    const textWidth = PAGE_WIDTH - MARGIN_RIGHT - textX
    const textMaxChars = Math.max(28, Math.floor(textWidth / (10 * 0.54)))

    const lineEntries: string[] = []
    lineEntries.push(`${params.titlePrefix || 'Carta'} #${cardNumber ?? '-'}`)
    lineEntries.push(`Descricao: ${params.card?.description || '-'}`)
    lineEntries.push(`Palavras-chave: ${params.card?.keywords || '-'}`)
    if (params.card?.observation) {
      lineEntries.push(`Observacao: ${params.card.observation}`)
    }

    const wrappedLines = lineEntries.flatMap((line) => wrapText(line, textMaxChars))
    const lineHeight = 12
    const textHeight = Math.max(24, wrappedLines.length * lineHeight + 4)
    const blockHeight = Math.max(imageHeight + 6, textHeight + 8)

    ensureSpace(blockHeight + 8)
    const blockTop = cursorY
    drawRect(
      currentPage,
      MARGIN_LEFT,
      blockTop,
      PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT,
      blockHeight,
      [0.96, 0.97, 0.98]
    )

    deckImageSlots.push({
      pageIndex: pages.length - 1,
      x: imageX,
      topY: blockTop + 4,
      width: imageWidth,
      height: imageHeight,
      cardNumber,
      card: params.card
    })

    let textY = blockTop + 18
    wrappedLines.forEach((line, index) => {
      drawText(currentPage, line, textX, textY, {
        font: index === 0 ? 'F2' : 'F1',
        size: 10,
        color: [0.11, 0.17, 0.22]
      })
      textY += lineHeight
    })

    cursorY += blockHeight + 8
  }

  startBodyPage('1. Resumo rapido')
  addSummaryIndicatorCards([
    { label: 'Quantidade de jogadas', value: String(totalMoves) },
    {
      label: 'Quantidade ate inicio',
      value: String(participantState?.rollCountUntilStart ?? 0)
    },
    { label: 'Registros terapeuticos', value: String(totalTherapyEntries) },
    { label: 'Assistencia de IA', value: String(tipReports.length) },
    { label: 'Tiragens de cartas', value: String(totalCardDraws) }
  ])

  addSpacer(12)
  addSectionTitle('2. Visao geral da sessao')
  addOverviewCards([
    { label: 'Terapeuta joga', value: room.therapistPlays ? 'Sim' : 'Nao' },
    {
      label: 'Intencao do jogador',
      value: focusParticipant?.gameIntention?.trim() || 'Nao informada'
    },
    {
      label: 'Consentimento',
      value: focusParticipant?.consentAcceptedAt ? formatDate(focusParticipant.consentAcceptedAt) : 'Nao aceito'
    },
    {
      label: 'Casa atual',
      value: `${currentHouseNumber} (${currentHouse?.title || '-'})`
    },
    {
      label: 'Concluiu partida',
      value: participantState?.hasCompleted ? 'Sim' : 'Nao'
    },
    {
      label: 'Inicio da partida',
      value: startDate ? formatDate(startDate) : '-'
    },
    {
      label: 'Fim da partida',
      value: endDate ? formatDate(endDate) : '-'
    },
    { label: 'Tempo da partida', value: durationLabel }
  ])

  addSpacer(12)
  addSectionTitle('3. Jornada')
  if (participantMoves.length === 0) {
    addParagraph('Ainda nao ha jogadas registradas para este jogador nesta sessao.')
  } else {
    let postStartMoveIndex = 0
    const consumedProgressIds = new Set<string>()

    participantMoves.forEach((move) => {
      const hadJump = move.appliedJumpFrom !== null && move.appliedJumpTo !== null
      if (isPostStartMove(move)) {
        postStartMoveIndex += 1
      }

      const journeyTitle = hadJump
        ? `Jogada ${move.turnNumber}: ${formatHouseName(move.fromPos)} -> ${formatHouseName(move.appliedJumpFrom || move.toPos)} -> ${formatHouseName(move.appliedJumpTo || move.toPos)}`
        : `Jogada ${move.turnNumber}: ${formatHouseName(move.fromPos)} -> ${formatHouseName(move.toPos)}`
      addParagraph(journeyTitle, { font: 'F2', size: 11 })
      if (isPostStartMove(move) && !hadJump) {
        addParagraph('Explicacao da casa:', { indent: 14, size: 10, font: 'F2' })
        const houseExplanationLines = getHouseExplanationLines(move.toPos)
        houseExplanationLines.forEach((line) => {
          addParagraph(line, { indent: 28, size: 10 })
        })
      }

      if (hadJump) {
        const jumpFrom = move.appliedJumpFrom as number
        const jumpTo = move.appliedJumpTo as number
        addParagraph(
          `Atalho: ${formatHouseName(jumpFrom)} -> ${formatHouseName(jumpTo)} (${jumpTo > jumpFrom ? 'subida' : 'descida'})`,
          { indent: 14, size: 10 }
        )
        addParagraph('Explicacao completa do atalho (origem):', {
          indent: 14,
          size: 10,
          font: 'F2'
        })
        const jumpFromExplanationLines = getHouseExplanationLines(jumpFrom)
        jumpFromExplanationLines.forEach((line) => {
          addParagraph(line, { indent: 28, size: 10 })
        })

        addParagraph('Explicacao completa do atalho (destino):', {
          indent: 14,
          size: 10,
          font: 'F2'
        })
        const jumpToExplanationLines = getHouseExplanationLines(jumpTo)
        jumpToExplanationLines.forEach((line) => {
          addParagraph(line, { indent: 28, size: 10 })
        })
      }

      if (move.therapyEntries.length > 0) {
        addParagraph('Registros terapeuticos:', { indent: 14, size: 10, font: 'F2' })
        move.therapyEntries.forEach((entry, index) => {
          addParagraph(`Registro ${index + 1}:`, { indent: 28, size: 10, font: 'F2' })
          if (entry.emotion) {
            addParagraph(
              `Emocao: ${entry.emotion}${entry.intensity ? ` (${entry.intensity}/10)` : ''}`,
              { indent: 42, size: 10 }
            )
          }
          if (entry.insight) addParagraph(`Insight: ${entry.insight}`, { indent: 42, size: 10 })
          if (entry.body) addParagraph(`Corpo: ${entry.body}`, { indent: 42, size: 10 })
          if (entry.microAction) addParagraph(`Acao: ${entry.microAction}`, { indent: 42, size: 10 })
        })
      }

      const tipsForMove = tipByTurn.get(move.turnNumber) || []
      if (tipsForMove.length > 0) {
        addParagraph('Ajudas da IA:', { indent: 14, size: 10, font: 'F2' })
        tipsForMove.forEach((tip, index) => {
          addParagraph(`Ajuda ${index + 1}:`, {
            indent: 28,
            size: 10,
            font: 'F2'
          })
          addMultilineParagraph(tip.text, { indent: 42, size: 10 })
        })
      }

      if (move.cardDraws.length > 0) {
        addParagraph('Cartas tiradas:', { indent: 14, size: 10, font: 'F2' })
        move.cardDraws.forEach((draw) => {
          addCardWithSideText({
            card: draw.card || null,
            cards: draw.cards,
            titlePrefix: 'Carta'
          })
        })
      }

      const progressForMove = progressByIntervalEnd.get(postStartMoveIndex) || []
      if (progressForMove.length > 0) {
        progressForMove.forEach((progressReport) => {
          consumedProgressIds.add(progressReport.id)
          const intervalLabel =
            progressReport.intervalStart !== null && progressReport.intervalEnd !== null
              ? `${progressReport.intervalStart} - ${progressReport.intervalEnd}`
              : extractProgressInterval(progressReport.text) || '-'
          addParagraph(`Caminho ate agora (${intervalLabel})`, {
            indent: 14,
            size: 10,
            font: 'F2'
          })
          addMultilineParagraph(progressReport.text, { indent: 28, size: 10 })
        })
      }

      addSpacer(8)
    })

    if (standaloneDraws.length > 0) {
      addParagraph('Tiragens sem jogada vinculada:', { font: 'F2', size: 11 })
      standaloneDraws.forEach((draw) => {
        addCardWithSideText({
          card: draw.card || null,
          cards: draw.cards,
          titlePrefix: 'Carta'
        })
      })
    }

    if (extraTips.length > 0) {
      addParagraph('Ajudas da IA sem jogada vinculada:', { font: 'F2', size: 11 })
      extraTips.forEach((tip, index) => {
        addParagraph(
          `Ajuda ${index + 1}${tip.turnNumber ? ` (jogada ${tip.turnNumber})` : ''}`,
          { indent: 14, size: 10, font: 'F2' }
        )
        addMultilineParagraph(tip.text, { indent: 28, size: 10 })
      })
    }

    const unmatchedProgressReports = [
      ...Array.from(progressByIntervalEnd.values())
        .flat()
        .filter((report) => !consumedProgressIds.has(report.id)),
      ...extraProgressReports
    ]
    if (unmatchedProgressReports.length > 0) {
      addParagraph('Caminho ate agora sem intervalo vinculado:', {
        font: 'F2',
        size: 11
      })
      unmatchedProgressReports.forEach((progressReport, index) => {
        const intervalLabel =
          progressReport.intervalStart !== null && progressReport.intervalEnd !== null
            ? `${progressReport.intervalStart} - ${progressReport.intervalEnd}`
            : '-'
        addParagraph(
          `Caminho ${index + 1} (intervalo ${intervalLabel})`,
          { indent: 14, size: 10, font: 'F2' }
        )
        addMultilineParagraph(progressReport.text, { indent: 28, size: 10 })
      })
    }
  }

  addSpacer(12)
  addSectionTitle('4. Resumo da Jornada')
  if (pathHouses.length === 0) {
    addParagraph('Sem caminho registrado ate o momento.')
  } else {
    addParagraph(`Caminho completo: ${pathHouses.map((house) => formatHouseName(house)).join(' -> ')}`)
  }

  if (recurringHouses.length === 0) {
    addParagraph('Casas mais recorrentes: sem dados.')
  } else {
    addParagraph('Casas mais recorrentes:', { font: 'F2', size: 11 })
    recurringHouses.forEach(([houseNumber, count], index) => {
      addParagraph(`${index + 1}. ${formatHouseName(houseNumber)} - ${count} vez(es)`, { indent: 14, size: 10 })
    })
  }

  addSpacer(12)
  addSectionTitle('5. Sintese Final pela IA')
  if (finalReports.length === 0) {
    addParagraph('Nenhum relatorio final da IA foi registrado para este jogador.')
  } else {
    finalReports.forEach((report, index) => {
      addParagraph(`Relatorio final ${index + 1} - ${formatDate(report.createdAt)}`, {
        font: 'F2',
        size: 11
      })
      addMultilineParagraph(extractAiReportText(report.content), { indent: 14, size: 10 })
      addSpacer(6)
    })
  }

  addSpacer(12)
  addSectionTitle('6. Sintese final pelo Terapeuta')
  addMultilineParagraph(
    focusParticipant?.therapistSummary || 'Sem sintese final registrada pelo terapeuta para esta sessao.',
    {
      size: 10
    }
  )

  const totalPages = pages.length
  const footerLineOne =
    'Maha Lilah Online e uma plataforma de apoio terapeutico. Nao substitui terapia, atendimento medico ou emergencia. Resultados variam conforme contexto e conducao.'
  const footerLineTwo =
    'Os dados deste relatorio sao gerados por IA e pelo terapeuta. Toda informacao deve ser revisada e validada com acompanhamento profissional antes de qualquer decisao.'

  pages.forEach((page, index) => {
    const headerColor: [number, number, number] = index === 0 ? [1, 1, 1] : [0.10, 0.26, 0.31]
    const headerLineColor: [number, number, number] = index === 0 ? [0.30, 0.45, 0.50] : [0.87, 0.90, 0.92]

    drawText(page, `Maha Lilah Online - Sala ${room.code} - ${options.playerName}`, MARGIN_LEFT, 24, {
      font: 'F2',
      size: 10,
      color: headerColor
    })
    drawLine(page, MARGIN_LEFT, 36, PAGE_WIDTH - MARGIN_RIGHT, headerLineColor, 0.8)

    const footerTop = PAGE_HEIGHT - 76
    drawLine(page, MARGIN_LEFT, footerTop, PAGE_WIDTH - MARGIN_RIGHT, [0.87, 0.90, 0.92], 0.8)
    const footerMaxChars = Math.max(
      74,
      Math.floor((PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT) / (8 * 0.56))
    )
    const footerLines = [
      ...wrapText(footerLineOne, footerMaxChars),
      ...wrapText(footerLineTwo, footerMaxChars)
    ]
    footerLines.forEach((line, lineIndex) => {
      drawText(page, line, MARGIN_LEFT, footerTop + 16 + lineIndex * 11, {
        font: 'F1',
        size: 8,
        color: [0.41, 0.46, 0.51]
      })
    })
    drawText(page, `Pagina ${index + 1} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT - 88, PAGE_HEIGHT - 18, {
      font: 'F1',
      size: 9,
      color: [0.45, 0.50, 0.54]
    })
  })

  const pageStreams = pages.map((ops) => ops.join('\n'))
  const objectMap: Record<number, string> = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    3: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    4: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
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

  return {
    buffer: Buffer.from(pdf, 'binary'),
    deckImageSlots
  }
}

async function appendDeckCardsWithImagesPdf(
  basePdfBuffer: Buffer,
  requestOrigin: string,
  deckImageSlots: DeckInlineImageSlot[]
) {
  try {
    if (deckImageSlots.length === 0) {
      return basePdfBuffer
    }

    const pdfDoc = await PDFDocument.load(basePdfBuffer)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    for (const slot of deckImageSlots) {
      const page = pdfDoc.getPage(slot.pageIndex)
      if (!page) continue
      const pageHeight = page.getHeight()

      let imageDrawn = false
      if (slot.card) {
        const imageData = await loadCardImageForPdf(slot.card, requestOrigin)
        if (imageData?.format === 'png') {
          const png = await pdfDoc.embedPng(imageData.bytes)
          page.drawImage(png, {
            x: slot.x,
            y: pageHeight - slot.topY - slot.height,
            width: slot.width,
            height: slot.height
          })
          imageDrawn = true
        } else if (imageData?.format === 'jpg') {
          const jpg = await pdfDoc.embedJpg(imageData.bytes)
          page.drawImage(jpg, {
            x: slot.x,
            y: pageHeight - slot.topY - slot.height,
            width: slot.width,
            height: slot.height
          })
          imageDrawn = true
        }
      }

      if (!imageDrawn) {
        page.drawRectangle({
          x: slot.x,
          y: pageHeight - slot.topY - slot.height,
          width: slot.width,
          height: slot.height,
          borderColor: rgb(0.78, 0.82, 0.86),
          borderWidth: 1
        })
        page.drawText('Imagem indisponivel', {
          x: slot.x + 6,
          y: pageHeight - slot.topY - 56,
          size: 8,
          font: fontRegular,
          color: rgb(0.45, 0.5, 0.54)
        })
      }
    }

    const bytes = await pdfDoc.save()
    return Buffer.from(bytes)
  } catch (error) {
    console.error('Nao foi possivel anexar miniaturas no PDF de exportacao:', error)
    return basePdfBuffer
  }
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
                (draw) => draw.drawnByParticipantId === scopedParticipantId
              )
            })),
          cardDraws: room.cardDraws.filter(
            (draw) => draw.moveId === null && draw.drawnByParticipantId === scopedParticipantId
          ),
          aiReports: room.aiReports.filter(
            (report) => report.participantId === scopedParticipantId
          )
        } as ExportRoom)
      : room

    const targetParticipant =
      (scopedParticipantId
        ? room.participants.find((participant) => participant.id === scopedParticipantId)
        : null) ||
      room.participants.find((participant) => participant.role !== 'THERAPIST') ||
      room.participants[0] ||
      null
    const therapistName =
      therapistParticipant?.user.name || therapistParticipant?.user.email || 'Nao identificado'
    const playerName =
      targetParticipant?.user.name || targetParticipant?.user.email || 'Sessao completa'

    const { buffer: basePdfBuffer, deckImageSlots } = buildPdf(exportRoom, {
      therapistName,
      playerName,
      focusParticipantId: targetParticipant?.id || scopedParticipantId || null,
      generatedAt: new Date()
    })
    const requestOrigin = new URL(request.url).origin
    const pdfBuffer = await appendDeckCardsWithImagesPdf(
      basePdfBuffer,
      requestOrigin,
      deckImageSlots
    )

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
