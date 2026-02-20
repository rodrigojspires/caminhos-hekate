import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const optionalDateField = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined
  if (value instanceof Date) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? value : parsed
}, z.date().optional())

// Schema de validação para criação de usuário
const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VISITOR']).default('VISITOR'),
  subscriptionTier: z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']).default('FREE'),
  isTherapist: z.boolean().optional().default(false),
  dateOfBirth: optionalDateField
})

// Schema de validação para atualização de usuário
const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VISITOR']).optional(),
  subscriptionTier: z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']).optional(),
  isTherapist: z.boolean().optional(),
  dateOfBirth: optionalDateField
})

// GET - Listar usuários com filtros e paginação
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const subscriptionTier = searchParams.get('subscriptionTier')
    const registrationPortal = searchParams.get('registrationPortal')
    const isTherapist = searchParams.get('isTherapist')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      NOT: {
        email: { startsWith: 'deleted_' }
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role) where.role = role
    if (subscriptionTier) where.subscriptionTier = subscriptionTier
    if (registrationPortal) where.registrationPortal = registrationPortal
    if (isTherapist === 'true') where.isTherapist = true
    if (isTherapist === 'false') where.isTherapist = false

    // Buscar usuários
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionTier: true,
          isTherapist: true,
          dateOfBirth: true,
          registrationPortal: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              enrollments: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 }
      )
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        ...validatedData
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        isTherapist: true,
        dateOfBirth: true,
        createdAt: true
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
