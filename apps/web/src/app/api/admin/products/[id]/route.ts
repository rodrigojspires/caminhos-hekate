import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para atualização de produto
const updateProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']).optional(),
  categoryId: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.any().optional(), // JSON field
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
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

// GET /api/admin/products/[id] - Buscar produto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          }
        },
        variants: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          },
          orderBy: {
            id: 'desc'
          },
          take: 10 // Últimos 10 pedidos
        },
        _count: {
          select: {
            orderItems: true,
            variants: true,
          }
        }
      }
    })
    
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ product })
    
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/products/[id] - Atualizar produto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const body = await request.json()
    const data = updateProductSchema.parse(body)
    
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }
    
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
    
    // Transformar null em undefined para campos opcionais
    const updateData = {
      ...data,
      categoryId: data.categoryId === null ? undefined : data.categoryId,
    }

    // Atualizar produto
    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        variants: true,
        _count: {
          select: {
            orderItems: true,
            variants: true,
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      product,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/[id] - Deletar produto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        orderItems: true,
        variants: true,
      }
    })
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar se produto tem pedidos associados
    if (existingProduct.orderItems.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível deletar produto com pedidos associados',
          suggestion: 'Considere desativar o produto ao invés de deletá-lo'
        },
        { status: 400 }
      )
    }
    
    // Deletar produto (variants serão deletadas automaticamente devido ao onDelete: Cascade)
    await prisma.product.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Produto deletado com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}