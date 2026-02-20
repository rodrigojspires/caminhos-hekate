import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'

const updateSessionSchema = z.object({
  therapistUserId: z.string().nullable().optional(),
  sessionDate: z.string().nullable().optional(),
  comments: z.string().max(8000).nullable().optional(),
  sessionData: z.string().max(20000).nullable().optional(),
  mode: z.enum(['IN_PERSON', 'DISTANCE', 'ONLINE']).nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELED']).optional(),
})

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const data = updateSessionSchema.parse(body)

    const session = await prisma.therapeuticSession.findUnique({
      where: { id: params.id },
      include: {
        process: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (session.process.status === 'IN_ANALYSIS') {
      return NextResponse.json({ error: 'Sessões só podem ser atualizadas após iniciar o tratamento' }, { status: 400 })
    }

    const sessionDate = parseDate(data.sessionDate)
    if (data.sessionDate !== undefined && sessionDate === undefined) {
      return NextResponse.json({ error: 'Data de sessão inválida' }, { status: 400 })
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

    const updated = await prisma.therapeuticSession.update({
      where: { id: session.id },
      data: {
        therapistUserId: data.therapistUserId,
        sessionDate,
        comments: data.comments,
        sessionData: data.sessionData,
        mode: data.mode,
        status: data.status,
      },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ session: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Erro ao atualizar sessão terapêutica:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
