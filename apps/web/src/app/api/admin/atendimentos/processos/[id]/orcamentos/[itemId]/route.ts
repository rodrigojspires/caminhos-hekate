import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { computeBudgetValues } from '@/lib/therapeutic-care'

const updateBudgetItemSchema = z.object({
  therapyId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  discountAmount: z.coerce.number().min(0).nullable().optional(),
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = updateBudgetItemSchema.parse(body)

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

    const currentItem = await prisma.therapeuticBudgetItem.findFirst({
      where: { id: params.itemId, processId: params.id },
      include: { therapy: true },
    })

    if (!currentItem) {
      return NextResponse.json({ error: 'Item de orçamento não encontrado' }, { status: 404 })
    }

    const therapy = data.therapyId
      ? await prisma.therapy.findUnique({ where: { id: data.therapyId } })
      : currentItem.therapy

    if (!therapy) {
      return NextResponse.json({ error: 'Terapia não encontrada' }, { status: 404 })
    }

    const quantity = data.quantity ?? currentItem.quantity
    const discountPercent = data.discountPercent !== undefined ? data.discountPercent : Number(currentItem.discountPercent ?? 0)
    const discountAmount = data.discountAmount !== undefined ? data.discountAmount : Number(currentItem.discountAmount ?? 0)

    const calculated = computeBudgetValues({
      therapyValue: Number(therapy.value),
      valuePerSession: therapy.valuePerSession,
      quantity,
      discountPercent,
      discountAmount,
    })

    const orderedItems = await prisma.therapeuticBudgetItem.findMany({
      where: { processId: params.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, sortOrder: true },
    })

    const currentIndex = orderedItems.findIndex((item) => item.id === currentItem.id)
    if (currentIndex < 0) {
      return NextResponse.json({ error: 'Item de orçamento não encontrado' }, { status: 404 })
    }

    const reorderedIds = orderedItems.map((item) => item.id)
    if (data.sortOrder !== undefined) {
      const targetIndex = clamp(data.sortOrder, 0, reorderedIds.length - 1)
      reorderedIds.splice(currentIndex, 1)
      reorderedIds.splice(targetIndex, 0, currentItem.id)
    }

    const item = await prisma.$transaction(async (tx) => {
      const orderMap = new Map(reorderedIds.map((id, index) => [id, index]))

      const updatedCurrentItem = await tx.therapeuticBudgetItem.update({
        where: { id: currentItem.id },
        data: {
          therapyId: therapy.id,
          quantity,
          sortOrder: orderMap.get(currentItem.id) ?? currentIndex,
          discountPercent,
          discountAmount,
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

      for (const entry of orderedItems) {
        if (entry.id === currentItem.id) continue
        const nextSortOrder = orderMap.get(entry.id)
        if (nextSortOrder === undefined || nextSortOrder === entry.sortOrder) continue

        await tx.therapeuticBudgetItem.update({
          where: { id: entry.id },
          data: { sortOrder: nextSortOrder },
        })
      }

      return updatedCurrentItem
    })

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao atualizar item de orçamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
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

    const deleted = await prisma.$transaction(async (tx) => {
      const removed = await tx.therapeuticBudgetItem.deleteMany({
        where: { id: params.itemId, processId: params.id },
      })

      const remaining = await tx.therapeuticBudgetItem.findMany({
        where: { processId: params.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, sortOrder: true },
      })

      for (let index = 0; index < remaining.length; index += 1) {
        const item = remaining[index]
        if (item.sortOrder === index) continue

        await tx.therapeuticBudgetItem.update({
          where: { id: item.id },
          data: { sortOrder: index },
        })
      }

      return removed
    })

    return NextResponse.json({ success: true, deleted: deleted.count })
  } catch (error) {
    console.error('Erro ao remover item de orçamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
