import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const optionalDateField = z.preprocess((value) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (value instanceof Date) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? value : parsed
}, z.date().nullable().optional())

// Schema de validação para atualização de usuário
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VISITOR']).optional(),
  subscriptionTier: z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']).optional(),
  dateOfBirth: optionalDateField
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Buscar usuário por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { id } = params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        dateOfBirth: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            enrollments: true
          }
        },
        addresses: {
          select: {
            id: true,
            name: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            phone: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' }
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true
          }
        },
        enrollments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        therapeuticProcessesAsPatient: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            sessions: {
              orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                sessionNumber: true,
                sessionDate: true,
                createdAt: true,
                status: true,
                mode: true,
                comments: true,
                budgetItem: {
                  select: {
                    therapyNameSnapshot: true
                  }
                },
                therapist: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        therapeuticSingleSessionsAsPatient: {
          orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            sessionDate: true,
            createdAt: true,
            status: true,
            mode: true,
            comments: true,
            therapyNameSnapshot: true,
            therapist: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const processSessions = user.therapeuticProcessesAsPatient.flatMap((process) =>
      process.sessions.map((session) => ({
        id: session.id,
        source: 'PROCESS' as const,
        processId: process.id,
        processStatus: process.status,
        sessionNumber: session.sessionNumber,
        therapyName: session.budgetItem.therapyNameSnapshot,
        sessionDate: session.sessionDate,
        createdAt: session.createdAt,
        referenceDate: session.sessionDate ?? session.createdAt,
        status: session.status,
        mode: session.mode,
        comments: session.comments,
        therapist: session.therapist
      }))
    )

    const singleSessions = user.therapeuticSingleSessionsAsPatient.map((session) => ({
      id: session.id,
      source: 'SINGLE' as const,
      processId: null,
      processStatus: null,
      sessionNumber: null,
      therapyName: session.therapyNameSnapshot,
      sessionDate: session.sessionDate,
      createdAt: session.createdAt,
      referenceDate: session.sessionDate ?? session.createdAt,
      status: session.status,
      mode: session.mode,
      comments: session.comments,
      therapist: session.therapist
    }))

    const therapeuticSessions = [...processSessions, ...singleSessions]
      .sort((a, b) => b.referenceDate.getTime() - a.referenceDate.getTime())
      .map(({ referenceDate, ...item }) => item)

    const {
      therapeuticProcessesAsPatient,
      therapeuticSingleSessionsAsPatient,
      ...userData
    } = user

    return NextResponse.json({
      ...userData,
      therapeuticSessions
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Se email está sendo alterado, verificar se já existe
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email já está em uso' },
          { status: 400 }
        )
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        dateOfBirth: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { id } = params

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir exclusão do próprio admin
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Não é possível excluir sua própria conta' },
        { status: 400 }
      )
    }

    // Soft delete - alterar email para evitar conflitos
    await prisma.user.update({
      where: { id },
      data: {
        email: `deleted_${Date.now()}_${existingUser.email}` // Evitar conflitos de email
      }
    })

    return NextResponse.json(
      { message: 'Usuário excluído com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
