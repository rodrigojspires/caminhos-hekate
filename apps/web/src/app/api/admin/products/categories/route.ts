import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para criação de categoria
const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug deve conter apenas letras minúsculas, números e hífens'
  ),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().default(true),
})

// Schema de validação para query parameters
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  search: z.string().optional(),
  active: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  sortBy: z.enum(['name', 'createdAt', 'productsCount']).default('name').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
})

// Verificar se usuário tem permissão de admin
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  if (!['ADMIN', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  
  return null
}

// Função para gerar slug único
async function generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true }
    })
    
    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug
    }
    
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// GET /api/admin/products/categories - Listar categorias
export async function GET(request: NextRequest) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))
    
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit
    
    // Construir filtros
    const where: any = {}
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    
    if (query.active !== undefined) {
      where.active = query.active
    }
    
    // Construir ordenação
    let orderBy: any = {}
    
    switch (query.sortBy) {
      case 'name':
        orderBy = { name: query.sortOrder }
        break
      case 'createdAt':
        orderBy = { createdAt: query.sortOrder }
        break
      case 'productsCount':
        orderBy = { products: { _count: query.sortOrder } }
        break
      default:
        orderBy = { name: 'asc' }
    }
    
    // Buscar categorias
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              products: true,
            }
          }
        }
      }),
      prisma.category.count({ where })
    ])
    
    const totalPages = Math.ceil(total / limit)
    
    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/products/categories - Criar categoria
export async function POST(request: NextRequest) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const body = await request.json()
    const data = createCategorySchema.parse(body)
    
    // Verificar se slug já existe
    const uniqueSlug = await generateUniqueSlug(data.slug)
    
    // Lógica de categoria pai removida - não implementada no schema atual
    
    // Criar categoria
    const category = await prisma.category.create({
      data: {
        ...data,
        slug: uniqueSlug,
      },
      include: {
        _count: {
          select: {
            products: true,
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      category,
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}