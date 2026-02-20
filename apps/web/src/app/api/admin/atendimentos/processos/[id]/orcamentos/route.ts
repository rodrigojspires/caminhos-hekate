import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { computeBudgetValues } from '@/lib/therapeutic-care'

const budgetItemSchema = z.object({
  therapyId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sortOrder: z.coerce.number().int().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  discountAmount: z.coerce.number().min(0).nullable().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const items = await prisma.therapeuticBudgetItem.findMany({
      where: { processId: params.id },
      include: {
        therapy: {
          select: {
            id: true,
            name: true,
            value: true,
            valuePerSession: true,
            defaultSessions: true,
            singleSessionValue: true,
            active: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Erro ao listar itens do orçamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = budgetItemSchema.parse(body)

    const process = await prisma.therapeuticProcess.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })

    if (!process) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    if (process.status !== 'IN_ANALYSIS') {
      return NextResponse.json(
        { error: 'Somente processos em análise podem receber alterações no orçamento' },
        { status: 400 },
      )
    }

    const therapy = await prisma.therapy.findUnique({ where: { id: data.therapyId } })
    if (!therapy) {
      return NextResponse.json({ error: 'Terapia não encontrada' }, { status: 404 })
    }

    const calculated = computeBudgetValues({
      therapyValue: Number(therapy.value),
      valuePerSession: therapy.valuePerSession,
      quantity: data.quantity,
      discountPercent: data.discountPercent ?? null,
      discountAmount: data.discountAmount ?? null,
    })

    const lastOrder = await prisma.therapeuticBudgetItem.findFirst({
      where: { processId: params.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const item = await prisma.therapeuticBudgetItem.create({
      data: {
        processId: params.id,
        therapyId: data.therapyId,
        quantity: data.quantity,
        sortOrder: data.sortOrder ?? (lastOrder?.sortOrder ?? -1) + 1,
        discountPercent: data.discountPercent ?? null,
        discountAmount: data.discountAmount ?? null,
        therapyNameSnapshot: therapy.name,
        therapyValueSnapshot: therapy.value,
        valuePerSessionSnapshot: therapy.valuePerSession,
        singleSessionValueSnapshot: therapy.singleSessionValue,
        unitValue: calculated.unitValue,
        grossTotal: calculated.grossTotal,
        discountTotal: calculated.discountTotal,
        netTotal: calculated.netTotal,
      },
      include: {
        therapy: {
          select: {
            id: true,
            name: true,
            value: true,
            valuePerSession: true,
            defaultSessions: true,
            singleSessionValue: true,
            active: true,
          },
        },
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao adicionar item de orçamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
