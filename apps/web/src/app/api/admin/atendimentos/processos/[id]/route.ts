import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import {
  getMonthlyDueDates,
  splitInstallments,
  roundCurrency,
} from '@/lib/therapeutic-care'

const therapeuticStatusSchema = z.enum([
  'IN_ANALYSIS',
  'IN_TREATMENT',
  'NOT_APPROVED',
  'CANCELED',
  'FINISHED',
])

const dueDateModeSchema = z.enum(['AUTOMATIC_MONTHLY', 'MANUAL'])
const paymentMethodSchema = z.enum(['PIX', 'CARD_MERCADO_PAGO', 'NUBANK'])

const updateProcessSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  status: therapeuticStatusSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  installmentsCount: z.coerce.number().int().min(1).max(36).optional(),
  dueDateMode: dueDateModeSchema.optional(),
  firstDueDate: z.string().nullable().optional(),
  manualDueDates: z.array(z.string()).optional(),
})

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function canTransitionStatus(current: string, next: string): boolean {
  if (current === next) return true

  if (current === 'IN_ANALYSIS') {
    return ['IN_TREATMENT', 'NOT_APPROVED', 'CANCELED'].includes(next)
  }

  if (current === 'IN_TREATMENT') {
    return ['FINISHED', 'CANCELED'].includes(next)
  }

  return false
}

function serializeProcess(process: any) {
  const budgetItems = [...process.budgetItems].sort((a, b) => {
    if (a.sortOrder === b.sortOrder) return a.createdAt.getTime() - b.createdAt.getTime()
    return a.sortOrder - b.sortOrder
  })

  const budgetTotal = budgetItems.reduce((sum, item) => sum + Number(item.netTotal), 0)
  const grossTotal = budgetItems.reduce((sum, item) => sum + Number(item.grossTotal), 0)
  const discountTotal = budgetItems.reduce((sum, item) => sum + Number(item.discountTotal), 0)

  const installmentSimulation = Array.from({ length: 7 }, (_, idx) => {
    const count = idx + 1
    const parts = splitInstallments(budgetTotal, count)
    return {
      installments: count,
      installmentValue: parts[0] ?? 0,
      amounts: parts,
    }
  })

  const sessionsCount = process.sessions.length
  const completedSessions = process.sessions.filter((session: any) => session.status === 'COMPLETED').length
  const openInstallments = process.order?.installments?.filter((item: any) => item.status === 'OPEN') ?? []
  const paidInstallments = process.order?.installments?.filter((item: any) => item.status === 'PAID') ?? []

  return {
    ...process,
    budgetItems,
    summary: {
      grossTotal,
      discountTotal,
      budgetTotal,
      installmentSimulation,
      sessionsCount,
      completedSessions,
      openInstallmentsCount: openInstallments.length,
      paidInstallmentsCount: paidInstallments.length,
      openInstallmentsAmount: roundCurrency(openInstallments.reduce((sum: number, item: any) => sum + Number(item.amount), 0)),
      paidInstallmentsAmount: roundCurrency(paidInstallments.reduce((sum: number, item: any) => sum + Number(item.amount), 0)),
    },
  }
}

async function fetchProcessById(id: string) {
  return prisma.therapeuticProcess.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          dateOfBirth: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      budgetItems: {
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
      },
      sessions: {
        include: {
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          budgetItem: {
            select: {
              id: true,
              therapyNameSnapshot: true,
              sortOrder: true,
            },
          },
        },
        orderBy: [{ orderIndex: 'asc' }, { sessionNumber: 'asc' }],
      },
      order: {
        include: {
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      },
    },
  })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const process = await fetchProcessById(params.id)

    if (!process) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ process: serializeProcess(process) })
  } catch (error) {
    console.error('Erro ao carregar processo terapêutico:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = updateProcessSchema.parse(body)

    const process = await prisma.therapeuticProcess.findUnique({
      where: { id: params.id },
      include: {
        budgetItems: {
          include: {
            therapy: {
              select: {
                defaultSessions: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        sessions: {
          select: { id: true },
        },
        order: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    })

    if (!process) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    const statusToApply = data.status ?? process.status

    if (data.status && !canTransitionStatus(process.status, data.status)) {
      return NextResponse.json({ error: 'Transição de status não permitida' }, { status: 400 })
    }

    if (data.status === 'IN_TREATMENT') {
      if (process.status !== 'IN_ANALYSIS') {
        return NextResponse.json({ error: 'Somente processos em análise podem iniciar tratamento' }, { status: 400 })
      }

      if (process.order) {
        return NextResponse.json({ error: 'Este processo já possui pedido terapêutico' }, { status: 400 })
      }

      if (!process.budgetItems.length) {
        return NextResponse.json({ error: 'Cadastre o orçamento antes de iniciar o tratamento' }, { status: 400 })
      }

      const paymentMethod = data.paymentMethod
      const installmentsCount = data.installmentsCount
      const dueDateMode = data.dueDateMode

      if (!paymentMethod || !installmentsCount || !dueDateMode) {
        return NextResponse.json(
          { error: 'Informe meio de pagamento, quantidade de parcelas e modo de vencimento' },
          { status: 400 },
        )
      }

      const totalAmount = roundCurrency(
        process.budgetItems.reduce((sum, item) => sum + Number(item.netTotal), 0),
      )

      if (totalAmount <= 0) {
        return NextResponse.json({ error: 'Total do orçamento inválido' }, { status: 400 })
      }

      let dueDates: Date[] = []

      if (dueDateMode === 'AUTOMATIC_MONTHLY') {
        const firstDueDate = parseDate(data.firstDueDate)
        if (!firstDueDate) {
          return NextResponse.json({ error: 'Informe a primeira data de vencimento' }, { status: 400 })
        }
        dueDates = getMonthlyDueDates(firstDueDate, installmentsCount)
      } else {
        if (!Array.isArray(data.manualDueDates) || data.manualDueDates.length !== installmentsCount) {
          return NextResponse.json(
            { error: 'Informe todas as datas de vencimento para parcelas manuais' },
            { status: 400 },
          )
        }

        dueDates = data.manualDueDates.map((value) => parseDate(value)).filter((d): d is Date => !!d)

        if (dueDates.length !== installmentsCount) {
          return NextResponse.json({ error: 'Uma ou mais datas de vencimento são inválidas' }, { status: 400 })
        }
      }

      const installmentAmounts = splitInstallments(totalAmount, installmentsCount)

      let globalOrder = 1
      const sessionsToCreate: Array<{
        processId: string
        budgetItemId: string
        sessionNumber: number
        orderIndex: number
        status: 'PENDING'
      }> = []

      for (const item of process.budgetItems) {
        const defaultSessions = Math.max(1, Number(item.therapy?.defaultSessions ?? 1))
        const totalSessionsForItem = Math.max(1, Number(item.quantity)) * defaultSessions

        for (let sessionNumber = 1; sessionNumber <= totalSessionsForItem; sessionNumber += 1) {
          sessionsToCreate.push({
            processId: process.id,
            budgetItemId: item.id,
            sessionNumber,
            orderIndex: globalOrder,
            status: 'PENDING',
          })
          globalOrder += 1
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.therapeuticProcess.update({
          where: { id: process.id },
          data: {
            status: 'IN_TREATMENT',
            startedAt: new Date(),
            notes: data.notes !== undefined ? data.notes : process.notes,
          },
        })

        if (sessionsToCreate.length > 0) {
          await tx.therapeuticSession.createMany({ data: sessionsToCreate })
        }

        await tx.therapeuticOrder.create({
          data: {
            processId: process.id,
            status: 'OPEN',
            paymentMethod,
            dueDateMode,
            installmentsCount,
            firstDueDate: dueDateMode === 'AUTOMATIC_MONTHLY' ? dueDates[0] : null,
            totalAmount,
            installments: {
              create: installmentAmounts.map((amount, index) => ({
                installmentNumber: index + 1,
                amount,
                dueDate: dueDates[index],
                status: 'OPEN',
              })),
            },
          },
        })
      })

      const updated = await fetchProcessById(process.id)
      return NextResponse.json({ process: updated ? serializeProcess(updated) : null })
    }

    const updatedProcess = await prisma.therapeuticProcess.update({
      where: { id: process.id },
      data: {
        status: statusToApply,
        notes: data.notes !== undefined ? data.notes : process.notes,
      },
    })

    const refreshed = await fetchProcessById(updatedProcess.id)
    return NextResponse.json({ process: refreshed ? serializeProcess(refreshed) : null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao atualizar processo terapêutico:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
