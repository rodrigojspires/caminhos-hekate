import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { roundCurrency, splitInstallments } from '@/lib/therapeutic-care'

const updateSingleSessionSchema = z.object({
  therapistUserId: z.string().nullable().optional(),
  sessionDate: z.string().nullable().optional(),
  mode: z.enum(['IN_PERSON', 'DISTANCE', 'ONLINE']).nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELED']).optional(),
  comments: z.string().max(8000).nullable().optional(),
  sessionData: z.string().max(20000).nullable().optional(),
  chargedAmount: z.coerce.number().positive().optional(),
})

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

async function fetchSingleSessionById(id: string) {
  return prisma.therapeuticSingleSession.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      therapy: {
        select: {
          id: true,
          name: true,
          value: true,
          valuePerSession: true,
          singleSessionValue: true,
          active: true,
        },
      },
      therapist: {
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
    const singleSession = await fetchSingleSessionById(params.id)
    if (!singleSession) {
      return NextResponse.json({ error: 'Sessão avulsa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ session: singleSession })
  } catch (error) {
    console.error('Erro ao carregar sessão avulsa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = updateSingleSessionSchema.parse(body)

    const singleSession = await prisma.therapeuticSingleSession.findUnique({
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

    if (!singleSession) {
      return NextResponse.json({ error: 'Sessão avulsa não encontrada' }, { status: 404 })
    }

    if (data.therapistUserId) {
      const therapist = await prisma.user.findFirst({
        where: {
          id: data.therapistUserId,
          isTherapist: true,
        },
        select: { id: true },
      })

      if (!therapist) {
        return NextResponse.json({ error: 'Terapeuta inválido' }, { status: 400 })
      }
    }

    const sessionDate = parseDate(data.sessionDate)
    if (data.sessionDate !== undefined && sessionDate === undefined) {
      return NextResponse.json({ error: 'Data da sessão inválida' }, { status: 400 })
    }
    if (sessionDate === null) {
      return NextResponse.json({ error: 'Data da sessão é obrigatória' }, { status: 400 })
    }

    const nextChargedAmount = roundCurrency(
      data.chargedAmount !== undefined ? data.chargedAmount : Number(singleSession.chargedAmount),
    )

    if (nextChargedAmount <= 0) {
      return NextResponse.json({ error: 'Valor cobrado inválido' }, { status: 400 })
    }

    const hasChargedAmountChange = nextChargedAmount !== Number(singleSession.chargedAmount)
    if (hasChargedAmountChange && singleSession.order) {
      const hasPaidInstallments = singleSession.order.installments.some((item) => item.status === 'PAID')
      if (hasPaidInstallments) {
        return NextResponse.json(
          { error: 'Não é possível alterar o valor após baixa financeira' },
          { status: 400 },
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.therapeuticSingleSession.update({
        where: { id: singleSession.id },
        data: {
          therapistUserId: data.therapistUserId,
          sessionDate,
          mode: data.mode,
          status: data.status,
          comments: data.comments,
          sessionData: data.sessionData,
          chargedAmount: nextChargedAmount,
        },
      })

      if (singleSession.order && hasChargedAmountChange) {
        const amounts = splitInstallments(nextChargedAmount, singleSession.order.installmentsCount)

        await tx.therapeuticSingleSessionOrder.update({
          where: { id: singleSession.order.id },
          data: {
            totalAmount: nextChargedAmount,
          },
        })

        for (const installment of singleSession.order.installments) {
          await tx.therapeuticSingleSessionInstallment.update({
            where: { id: installment.id },
            data: {
              amount: amounts[installment.installmentNumber - 1] ?? installment.amount,
            },
          })
        }
      }
    })

    const updated = await fetchSingleSessionById(singleSession.id)
    return NextResponse.json({ session: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao atualizar sessão avulsa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const singleSession = await prisma.therapeuticSingleSession.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!singleSession) {
      return NextResponse.json({ error: 'Sessão avulsa não encontrada' }, { status: 404 })
    }

    await prisma.therapeuticSingleSession.delete({
      where: { id: singleSession.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir sessão avulsa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
