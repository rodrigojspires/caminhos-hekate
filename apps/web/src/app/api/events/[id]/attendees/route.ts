import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventRegistrationStatus } from '@prisma/client'

// Schema de validação para filtros
const filtersSchema = z.object({
  status: z.array(z.nativeEnum(EventRegistrationStatus)).optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

// Schema para aprovação/rejeição de inscrições
const updateRegistrationSchema = z.object({
  status: z.nativeEnum(EventRegistrationStatus)
})

// Schema para remover inscrição
const deleteRegistrationSchema = z.object({
  registrationId: z.string()
})

// GET /api/events/[id]/attendees - Listar participantes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId } = params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        createdBy: true,
        isPublic: true,
        title: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissões
    const isCreator = event.createdBy === session.user.id
    const isRegistered = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: session.user.id
      }
    })

    // Apenas o criador ou participantes confirmados podem ver a lista
    if (!isCreator && !isAdmin && !isRegistered && !event.isPublic) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params_query = Object.fromEntries(searchParams.entries())
    
    const parsedParams = filtersSchema.parse({
      ...params_query,
      status: params_query.status ? params_query.status.split(',') : undefined
    })

    const { status, search, page, limit } = parsedParams

    // Construir filtros
    const where: any = {
      eventId
    }

    // Apenas criador ou admin pode ver todos os status
    if (!isCreator && !isAdmin) {
      where.status = EventRegistrationStatus.CONFIRMED
    } else if (status && status.length > 0) {
      where.status = { in: status }
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    const offset = (page - 1) * limit

    // Buscar participantes
    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: isCreator || isAdmin, // Email apenas para criador/admin
              image: true
            }
          }
        },
        orderBy: { registeredAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.eventRegistration.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      attendees: registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      },
      permissions: {
        canManage: isCreator || isAdmin
      }
    })
  } catch (error) {
    console.error('Erro ao buscar participantes:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id]/attendees - Aprovar/Rejeitar inscrições (apenas criador)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId } = params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário é o criador do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        createdBy: true,
        requiresApproval: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (event.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Apenas o criador pode gerenciar inscrições' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { registrationIds, ...updateData } = body
    
    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs das inscrições são obrigatórios' },
        { status: 400 }
      )
    }

    const validatedData = updateRegistrationSchema.parse(updateData)

    // Verificar se as inscrições existem e pertencem ao evento
    const existingRegistrations = await prisma.eventRegistration.findMany({
      where: {
        id: { in: registrationIds },
        eventId
      },
      select: { id: true, status: true }
    })

    if (existingRegistrations.length !== registrationIds.length) {
      return NextResponse.json(
        { error: 'Algumas inscrições não foram encontradas' },
        { status: 400 }
      )
    }

    // Atualizar inscrições
    const updatedRegistrations = await prisma.eventRegistration.updateMany({
      where: {
        id: { in: registrationIds },
        eventId
      },
      data: {
        status: validatedData.status,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: `${updatedRegistrations.count} inscrições atualizadas com sucesso`,
      updated: updatedRegistrations.count
    })
  } catch (error) {
    console.error('Erro ao atualizar inscrições:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id]/attendees - Remover inscrição (apenas criador)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId } = params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        createdBy: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (event.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Apenas o criador pode remover inscrições' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validatedData = deleteRegistrationSchema.parse(body)

    const existing = await prisma.eventRegistration.findFirst({
      where: {
        id: validatedData.registrationId,
        eventId
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada' },
        { status: 404 }
      )
    }

    await prisma.eventRegistration.delete({
      where: { id: validatedData.registrationId }
    })

    return NextResponse.json({ message: 'Inscrição removida com sucesso' })
  } catch (error) {
    console.error('Erro ao remover inscrição:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
