import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'

const baixaProcessSchema = z.object({
  paidAt: z.string().optional(),
  paidAmount: z.coerce.number().positive().optional(),
  paymentNote: z.string().max(4000).optional(),
})

function parseDate(value?: string): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

function computeOrderStatus(statuses: Array<'OPEN' | 'PAID' | 'CANCELED'>) {
  const paidCount = statuses.filter((status) => status === 'PAID').length
  if (paidCount === statuses.length) return 'PAID' as const
  if (paidCount > 0) return 'PARTIALLY_PAID' as const
  return 'OPEN' as const
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json().catch(() => ({}))
    const data = baixaProcessSchema.parse(body)

    const paidAt = parseDate(data.paidAt)

    const processInstallment = await prisma.therapeuticOrderInstallment.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    })

    if (processInstallment) {
      if (processInstallment.status === 'PAID') {
        return NextResponse.json({ error: 'Parcela já está quitada' }, { status: 400 })
      }

      const paidAmount = data.paidAmount ?? Number(processInstallment.amount)

      await prisma.$transaction(async (tx) => {
        await tx.therapeuticOrderInstallment.update({
          where: { id: processInstallment.id },
          data: {
            status: 'PAID',
            paidAt,
            paidAmount,
            paymentNote: data.paymentNote ?? processInstallment.paymentNote,
          },
        })

        const refreshedInstallments = await tx.therapeuticOrderInstallment.findMany({
          where: { orderId: processInstallment.orderId },
          select: { status: true },
        })

        const orderStatus = computeOrderStatus(refreshedInstallments.map((item) => item.status as any))

        await tx.therapeuticOrder.update({
          where: { id: processInstallment.orderId },
          data: { status: orderStatus },
        })
      })

      const updated = await prisma.therapeuticOrderInstallment.findUnique({
        where: { id: processInstallment.id },
        include: {
          order: {
            include: {
              installments: {
                orderBy: { installmentNumber: 'asc' },
              },
            },
          },
        },
      })

      return NextResponse.json({ source: 'PROCESS', installment: updated })
    }

    const singleInstallment = await prisma.therapeuticSingleSessionInstallment.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    })

    if (!singleInstallment) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
    }

    if (singleInstallment.status === 'PAID') {
      return NextResponse.json({ error: 'Parcela já está quitada' }, { status: 400 })
    }

    const paidAmount = data.paidAmount ?? Number(singleInstallment.amount)

    await prisma.$transaction(async (tx) => {
      await tx.therapeuticSingleSessionInstallment.update({
        where: { id: singleInstallment.id },
        data: {
          status: 'PAID',
          paidAt,
          paidAmount,
          paymentNote: data.paymentNote ?? singleInstallment.paymentNote,
        },
      })

      const refreshedInstallments = await tx.therapeuticSingleSessionInstallment.findMany({
        where: { orderId: singleInstallment.orderId },
        select: { status: true },
      })

      const orderStatus = computeOrderStatus(refreshedInstallments.map((item) => item.status as any))

      await tx.therapeuticSingleSessionOrder.update({
        where: { id: singleInstallment.orderId },
        data: { status: orderStatus },
      })
    })

    const updated = await prisma.therapeuticSingleSessionInstallment.findUnique({
      where: { id: singleInstallment.id },
      include: {
        order: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    })

    return NextResponse.json({ source: 'SINGLE', installment: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao dar baixa na parcela:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
