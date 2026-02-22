import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { roundCurrency } from '@/lib/therapeutic-care'

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

type InstallmentSummary = {
  status: 'OPEN' | 'PAID' | 'CANCELED'
  amount: number
  paidAmount: unknown
}

function getSafePaidAmount(paidAmount: unknown, amount: number) {
  return roundCurrency(Math.min(Math.max(Number(paidAmount || 0), 0), Number(amount)))
}

function getEffectivePaidAmount(installment: InstallmentSummary) {
  if (installment.status === 'PAID' && (installment.paidAmount === null || installment.paidAmount === undefined)) {
    return roundCurrency(Number(installment.amount))
  }

  return getSafePaidAmount(installment.paidAmount, installment.amount)
}

function getRemainingAmount(amount: number, paidAmount: unknown) {
  const safeAmount = roundCurrency(Number(amount))
  const safePaid = getSafePaidAmount(paidAmount, safeAmount)
  return roundCurrency(Math.max(0, safeAmount - safePaid))
}

function computeOrderStatus(installments: InstallmentSummary[]) {
  if (!installments.length) return 'OPEN' as const

  const activeInstallments = installments.filter((item) => item.status !== 'CANCELED')
  if (!activeInstallments.length) return 'CANCELED' as const

  const allPaid = activeInstallments.every(
    (item) => roundCurrency(Math.max(0, roundCurrency(Number(item.amount)) - getEffectivePaidAmount(item))) <= 0,
  )
  if (allPaid) return 'PAID' as const

  const totalPaid = activeInstallments.reduce(
    (sum, item) => sum + getEffectivePaidAmount(item),
    0,
  )
  if (totalPaid > 0) return 'PARTIALLY_PAID' as const

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

      const installmentAmount = roundCurrency(Number(processInstallment.amount))
      const currentPaidAmount = getSafePaidAmount(processInstallment.paidAmount, installmentAmount)
      const remainingAmount = getRemainingAmount(installmentAmount, currentPaidAmount)

      if (remainingAmount <= 0) {
        return NextResponse.json({ error: 'Parcela já está quitada' }, { status: 400 })
      }

      const paidAmount = roundCurrency(data.paidAmount ?? remainingAmount)
      if (paidAmount <= 0) {
        return NextResponse.json({ error: 'Valor de baixa inválido' }, { status: 400 })
      }

      if (paidAmount > remainingAmount) {
        return NextResponse.json(
          {
            error: `Valor de baixa maior que o saldo da parcela (${remainingAmount.toFixed(2)})`,
          },
          { status: 400 },
        )
      }

      const nextPaidAmount = roundCurrency(currentPaidAmount + paidAmount)
      const fullyPaid = getRemainingAmount(installmentAmount, nextPaidAmount) <= 0

      await prisma.$transaction(async (tx) => {
        await tx.therapeuticOrderInstallment.update({
          where: { id: processInstallment.id },
          data: {
            status: fullyPaid ? 'PAID' : 'OPEN',
            paidAt: fullyPaid ? paidAt : null,
            paidAmount: nextPaidAmount,
            paymentNote: data.paymentNote ?? processInstallment.paymentNote,
          },
        })

        const refreshedInstallments = await tx.therapeuticOrderInstallment.findMany({
          where: { orderId: processInstallment.orderId },
          select: { status: true, amount: true, paidAmount: true },
        })

        const orderStatus = computeOrderStatus(
          refreshedInstallments.map((item) => ({
            status: item.status as 'OPEN' | 'PAID' | 'CANCELED',
            amount: Number(item.amount),
            paidAmount: item.paidAmount ? Number(item.paidAmount) : null,
          })),
        )

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

      return NextResponse.json({
        source: 'PROCESS',
        installment: updated,
        payment: {
          appliedAmount: paidAmount,
          paidAmount: nextPaidAmount,
          remainingAmount: getRemainingAmount(installmentAmount, nextPaidAmount),
          fullyPaid,
        },
      })
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

    const installmentAmount = roundCurrency(Number(singleInstallment.amount))
    const currentPaidAmount = getSafePaidAmount(singleInstallment.paidAmount, installmentAmount)
    const remainingAmount = getRemainingAmount(installmentAmount, currentPaidAmount)

    if (remainingAmount <= 0) {
      return NextResponse.json({ error: 'Parcela já está quitada' }, { status: 400 })
    }

    const paidAmount = roundCurrency(data.paidAmount ?? remainingAmount)
    if (paidAmount <= 0) {
      return NextResponse.json({ error: 'Valor de baixa inválido' }, { status: 400 })
    }

    if (paidAmount > remainingAmount) {
      return NextResponse.json(
        {
          error: `Valor de baixa maior que o saldo da parcela (${remainingAmount.toFixed(2)})`,
        },
        { status: 400 },
      )
    }

    const nextPaidAmount = roundCurrency(currentPaidAmount + paidAmount)
    const fullyPaid = getRemainingAmount(installmentAmount, nextPaidAmount) <= 0

    await prisma.$transaction(async (tx) => {
      await tx.therapeuticSingleSessionInstallment.update({
        where: { id: singleInstallment.id },
        data: {
          status: fullyPaid ? 'PAID' : 'OPEN',
          paidAt: fullyPaid ? paidAt : null,
          paidAmount: nextPaidAmount,
          paymentNote: data.paymentNote ?? singleInstallment.paymentNote,
        },
      })

      const refreshedInstallments = await tx.therapeuticSingleSessionInstallment.findMany({
        where: { orderId: singleInstallment.orderId },
        select: { status: true, amount: true, paidAmount: true },
      })

      const orderStatus = computeOrderStatus(
        refreshedInstallments.map((item) => ({
          status: item.status as 'OPEN' | 'PAID' | 'CANCELED',
          amount: Number(item.amount),
          paidAmount: item.paidAmount ? Number(item.paidAmount) : null,
        })),
      )

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

    return NextResponse.json({
      source: 'SINGLE',
      installment: updated,
      payment: {
        appliedAmount: paidAmount,
        paidAmount: nextPaidAmount,
        remainingAmount: getRemainingAmount(installmentAmount, nextPaidAmount),
        fullyPaid,
      },
    })
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
