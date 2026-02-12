import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@hekate/database'
import { z } from 'zod'

const allowedEventNames = new Set([
  'ml_page_view',
  'ml_cta_click',
  'ml_scroll_depth',
  'ml_page_exit'
])

const eventSchema = z.object({
  name: z.string().min(1).max(64),
  action: z.string().min(1).max(64),
  label: z.string().min(1).max(160).optional(),
  value: z.number().optional(),
  page: z.string().min(1).max(240).optional(),
  sessionId: z.string().min(1).max(128).optional(),
  referrer: z.string().max(600).optional(),
  properties: z.record(z.unknown()).optional()
})

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]
    if (first) return first.trim()
  }
  return request.headers.get('x-real-ip') || undefined
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = eventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const event = parsed.data
    if (!allowedEventNames.has(event.name)) {
      return NextResponse.json({ error: 'Evento não permitido' }, { status: 400 })
    }

    const safeProperties = event.properties || {}
    const propertiesSize = JSON.stringify(safeProperties).length
    if (propertiesSize > 8_000) {
      return NextResponse.json({ error: 'Propriedades muito grandes' }, { status: 413 })
    }

    const serializedProperties = event.properties
      ? (JSON.parse(JSON.stringify(event.properties)) as Prisma.InputJsonValue)
      : undefined

    await prisma.analyticsEvent.create({
      data: {
        name: event.name,
        category: 'marketing_site',
        action: event.action,
        label: event.label,
        value: event.value,
        sessionId: event.sessionId,
        page: event.page,
        referrer: event.referrer,
        ipAddress: getIpAddress(request),
        userAgent: request.headers.get('user-agent') || undefined,
        properties: serializedProperties
      }
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar evento de marketing:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
