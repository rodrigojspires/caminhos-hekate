import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { requireAdmin } from '@/lib/require-admin'
import { roundCurrency } from '@/lib/therapeutic-care'

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const installmentStatus = searchParams.get('installmentStatus')

    const where: any = {}
    if (installmentStatus) {
      where.status = installmentStatus
    }

    const [processInstallments, singleInstallments] = await Promise.all([
      prisma.therapeuticOrderInstallment.findMany({
        where,
        include: {
          order: {
            include: {
              process: {
                include: {
                  patient: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                  createdBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      }),
      prisma.therapeuticSingleSessionInstallment.findMany({
        where,
        include: {
          order: {
            include: {
              singleSession: {
                include: {
                  patient: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                  createdBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      }),
    ])

    const installments = [
      ...processInstallments.map((installment) => ({
        ...installment,
        source: 'PROCESS' as const,
      })),
      ...singleInstallments.map((installment) => ({
        ...installment,
        source: 'SINGLE' as const,
      })),
    ].sort((a, b) => {
      const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (dueDiff !== 0) return dueDiff
      return a.installmentNumber - b.installmentNumber
    })

    const normalizedInstallments = installments.map((item) => {
      const amount = roundCurrency(Number(item.amount))
      const paidAmountRaw =
        item.status === 'PAID' && (item.paidAmount === null || item.paidAmount === undefined)
          ? amount
          : Number(item.paidAmount || 0)
      const paidAmount = roundCurrency(
        Math.min(Math.max(paidAmountRaw, 0), amount),
      )
      const remainingAmount = roundCurrency(Math.max(0, amount - paidAmount))

      return {
        ...item,
        paidAmount,
        remainingAmount,
      }
    })

    const summary = {
      totalOpen: roundCurrency(
        normalizedInstallments
          .filter((item) => item.status === 'OPEN')
          .reduce((sum, item) => sum + Number(item.remainingAmount), 0),
      ),
      totalPaid: roundCurrency(
        normalizedInstallments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
      ),
      countOpen: normalizedInstallments.filter((item) => item.status === 'OPEN').length,
      countPaid: normalizedInstallments.filter((item) => item.status === 'PAID').length,
    }

    return NextResponse.json({ installments: normalizedInstallments, summary })
  } catch (error) {
    console.error('Erro ao carregar financeiro terapêutico:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
