import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { getMonthlyDueDates, roundCurrency, splitInstallments } from '@/lib/therapeutic-care'

const singleSessionSchema = z.object({
  patientUserId: z.string().min(1, 'Usuário é obrigatório'),
  therapyId: z.string().min(1, 'Terapia é obrigatória'),
  therapistUserId: z.string().optional().nullable(),
  sessionDate: z.string().optional().nullable(),
  mode: z.enum(['IN_PERSON', 'DISTANCE', 'ONLINE']).optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELED']).optional(),
  comments: z.string().max(8000).optional().nullable(),
  sessionData: z.string().max(20000).optional().nullable(),
  chargedAmount: z.coerce.number().positive().optional(),
  paymentMethod: z.enum(['PIX', 'CARD_MERCADO_PAGO', 'NUBANK']),
  dueDateMode: z.enum(['AUTOMATIC_MONTHLY', 'MANUAL']),
  installmentsCount: z.coerce.number().int().min(1).max(36),
  firstDueDate: z.string().optional().nullable(),
  manualDueDates: z.array(z.string()).optional(),
})

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const patientUserId = searchParams.get('patientUserId')
    const status = searchParams.get('status')

    const where: any = {}
    if (patientUserId) where.patientUserId = patientUserId
    if (status) where.status = status

    const sessions = await prisma.therapeuticSingleSession.findMany({
      where,
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
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Erro ao listar sessões avulsas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = singleSessionSchema.parse(body)

    const [patient, therapy] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.patientUserId }, select: { id: true } }),
      prisma.therapy.findUnique({ where: { id: data.therapyId } }),
    ])

    if (!patient) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!therapy) {
      return NextResponse.json({ error: 'Terapia não encontrada' }, { status: 404 })
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

    const sessionDate = parseDate(data.sessionDate) ?? new Date()

    const fallbackChargedAmount = Number(therapy.singleSessionValue ?? therapy.value)

    const chargedAmount = roundCurrency(data.chargedAmount ?? fallbackChargedAmount)

    if (chargedAmount <= 0) {
      return NextResponse.json({ error: 'Valor cobrado inválido' }, { status: 400 })
    }

    let dueDates: Date[] = []

    if (data.dueDateMode === 'AUTOMATIC_MONTHLY') {
      const firstDueDate = parseDate(data.firstDueDate)
      if (!firstDueDate) {
        return NextResponse.json({ error: 'Informe a primeira data de vencimento' }, { status: 400 })
      }
      dueDates = getMonthlyDueDates(firstDueDate, data.installmentsCount)
    } else {
      if (!Array.isArray(data.manualDueDates) || data.manualDueDates.length !== data.installmentsCount) {
        return NextResponse.json(
          { error: 'Informe todas as datas de vencimento para parcelas manuais' },
          { status: 400 },
        )
      }

      dueDates = data.manualDueDates
        .map((value) => parseDate(value))
        .filter((value): value is Date => !!value)

      if (dueDates.length !== data.installmentsCount) {
        return NextResponse.json({ error: 'Uma ou mais datas de vencimento são inválidas' }, { status: 400 })
      }
    }

    const installmentAmounts = splitInstallments(chargedAmount, data.installmentsCount)

    const singleSessionId = await prisma.$transaction(async (tx) => {
      const singleSession = await tx.therapeuticSingleSession.create({
        data: {
          patientUserId: data.patientUserId,
          therapyId: data.therapyId,
          createdByUserId: String(session?.user?.id),
          therapistUserId: data.therapistUserId || null,
          sessionDate,
          mode: data.mode ?? null,
          status: data.status ?? 'COMPLETED',
          comments: data.comments ?? null,
          sessionData: data.sessionData ?? null,
          therapyNameSnapshot: therapy.name,
          therapyValueSnapshot: therapy.value,
          valuePerSessionSnapshot: therapy.valuePerSession,
          singleSessionValueSnapshot: therapy.singleSessionValue,
          chargedAmount,
        },
      })

      await tx.therapeuticSingleSessionOrder.create({
        data: {
          singleSessionId: singleSession.id,
          status: 'OPEN',
          paymentMethod: data.paymentMethod,
          dueDateMode: data.dueDateMode,
          installmentsCount: data.installmentsCount,
          firstDueDate: data.dueDateMode === 'AUTOMATIC_MONTHLY' ? dueDates[0] : null,
          totalAmount: chargedAmount,
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

      return singleSession.id
    })

    const singleSession = await prisma.therapeuticSingleSession.findUnique({
      where: { id: singleSessionId },
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

    return NextResponse.json({ session: singleSession }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao criar sessão avulsa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
