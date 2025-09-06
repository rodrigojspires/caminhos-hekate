import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para criação de produto
const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  shortDescription: z.string().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']).default('PHYSICAL'),
  categoryId: z.string().nullable().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  trackQuantity: z.boolean().default(false),
  quantity: z.number().int().min(0).default(0),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
}).transform(data => ({
  ...data,
  categoryId: data.categoryId || null
}))

// Schema de validação para filtros
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']).optional(),
  active: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
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

// GET /api/admin/products - Listar produtos
export async function GET(request: NextRequest) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))
    
    // Construir filtros
    const where: any = {}
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    
    if (query.categoryId) {
      where.categoryId = query.categoryId
    }
    
    if (query.type) {
      where.type = query.type
    }
    
    if (query.active !== undefined) {
      where.active = query.active
    }
    
    // Contar total de produtos
    const total = await prisma.product.count({ where })
    
    // Buscar produtos com paginação
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            active: true,
          }
        },
        _count: {
          select: {
            orderItems: true,
            variants: true,
          }
        }
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })
    
    const totalPages = Math.ceil(total / query.limit)
    
    return NextResponse.json({
      products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/products - Criar produto
export async function POST(request: NextRequest) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const body = await request.json()
    const data = createProductSchema.parse(body)
    
    // SKU validation removed as it's not part of the Product model
    
    // Verificar se categoria existe (se fornecida)
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
      })
      
      if (!category) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 400 }
        )
      }
    }
    
    // Criar produto
    const product = await prisma.product.create({
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        variants: true,
      }
    })
    
    return NextResponse.json({
      success: true,
      product,
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}