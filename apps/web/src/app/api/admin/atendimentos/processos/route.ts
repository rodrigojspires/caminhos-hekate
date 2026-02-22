import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { roundCurrency } from '@/lib/therapeutic-care'

const createProcessSchema = z.object({
  patientUserId: z.string().min(1, 'Usuário é obrigatório'),
  notes: z.string().max(5000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')

    const where: any = {}
    if (status) where.status = status
    if (q) {
      where.OR = [
        { patient: { name: { contains: q, mode: 'insensitive' } } },
        { patient: { email: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const processes = await prisma.therapeuticProcess.findMany({
      where,
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
          select: { id: true, name: true, email: true },
        },
        budgetItems: {
          select: { netTotal: true },
        },
        sessions: {
          select: { id: true, status: true },
        },
        order: {
          include: {
            installments: {
              select: {
                id: true,
                status: true,
                amount: true,
                paidAmount: true,
                dueDate: true,
              },
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = processes.map((process) => {
      const budgetTotal = process.budgetItems.reduce((sum, item) => sum + Number(item.netTotal), 0)
      const openInstallments = process.order?.installments.filter((item) => item.status === 'OPEN') ?? []
      const paidInstallments = process.order?.installments.filter((item) => item.status === 'PAID') ?? []
      const openInstallmentsAmount = roundCurrency(
        openInstallments.reduce((sum, item) => {
          const amount = roundCurrency(Number(item.amount))
          const paidAmount = roundCurrency(
            Math.min(Math.max(Number(item.paidAmount || 0), 0), amount),
          )
          return sum + roundCurrency(Math.max(0, amount - paidAmount))
        }, 0),
      )

      return {
        ...process,
        budgetTotal,
        sessionsCount: process.sessions.length,
        openInstallmentsCount: openInstallments.length,
        paidInstallmentsCount: paidInstallments.length,
        openInstallmentsAmount,
      }
    })

    return NextResponse.json({ processes: data })
  } catch (error) {
    console.error('Erro ao listar processos terapêuticos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = createProcessSchema.parse(body)

    const patient = await prisma.user.findUnique({
      where: { id: data.patientUserId },
      select: { id: true },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const process = await prisma.therapeuticProcess.create({
      data: {
        patientUserId: data.patientUserId,
        createdByUserId: String(session?.user?.id),
        notes: data.notes ?? null,
        status: 'IN_ANALYSIS',
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ process }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao criar processo terapêutico:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
