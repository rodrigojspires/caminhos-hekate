import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'

const therapySchema = z.object({
  name: z.string().min(2, 'Nome da terapia é obrigatório'),
  value: z.coerce.number().positive('Valor deve ser maior que zero'),
  valuePerSession: z.boolean().default(true),
  defaultSessions: z.coerce.number().int().min(1).default(1),
  singleSessionValue: z.coerce.number().nonnegative().nullable().optional(),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const activeParam = searchParams.get('active')

    const where: any = {}
    if (activeParam === 'true') where.active = true
    if (activeParam === 'false') where.active = false

    const therapies = await prisma.therapy.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    })

    return NextResponse.json({ therapies })
  } catch (error) {
    console.error('Erro ao listar terapias:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = therapySchema.parse(body)

    const therapy = await prisma.therapy.create({
      data: {
        name: data.name.trim(),
        value: data.value,
        valuePerSession: data.valuePerSession,
        defaultSessions: data.defaultSessions,
        singleSessionValue: data.singleSessionValue ?? null,
        active: data.active,
      },
    })

    return NextResponse.json({ therapy }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao criar terapia:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
