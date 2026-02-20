import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'

const updateTherapySchema = z.object({
  name: z.string().min(2).optional(),
  value: z.coerce.number().positive().optional(),
  valuePerSession: z.boolean().optional(),
  defaultSessions: z.coerce.number().int().min(1).optional(),
  singleSessionValue: z.coerce.number().nonnegative().nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const therapy = await prisma.therapy.findUnique({ where: { id: params.id } })
    if (!therapy) {
      return NextResponse.json({ error: 'Terapia não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ therapy })
  } catch (error) {
    console.error('Erro ao buscar terapia:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = updateTherapySchema.parse(body)

    const existing = await prisma.therapy.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Terapia não encontrada' }, { status: 404 })
    }

    const therapy = await prisma.therapy.update({
      where: { id: params.id },
      data: {
        name: data.name?.trim(),
        value: data.value,
        valuePerSession: data.valuePerSession,
        defaultSessions: data.defaultSessions,
        singleSessionValue: data.singleSessionValue,
        active: data.active,
      },
    })

    return NextResponse.json({ therapy })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao atualizar terapia:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const therapy = await prisma.therapy.update({
      where: { id: params.id },
      data: { active: false },
    })

    return NextResponse.json({ therapy })
  } catch (error) {
    console.error('Erro ao desativar terapia:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
