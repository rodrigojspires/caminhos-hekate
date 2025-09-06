import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para atualização de categoria
const updateCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  slug: z.string().min(1, 'Slug é obrigatório').regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug deve conter apenas letras minúsculas, números e hífens'
  ).optional(),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
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

// Função auxiliar removida - hierarquia de categorias não implementada no schema atual

// GET /api/admin/products/categories/[id] - Buscar categoria por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            images: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Últimos 10 produtos
        },
        _count: {
          select: {
            products: true,
          }
        }
      }
    })
    
    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ category })
    
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/products/categories/[id] - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const body = await request.json()
    const data = updateCategorySchema.parse(body)
    
    // Verificar se categoria existe
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id }
    })
    
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }
    
    // Verificar se slug já existe em outra categoria (se fornecido)
    if (data.slug && data.slug !== existingCategory.slug) {
      const uniqueSlug = await generateUniqueSlug(data.slug, params.id)
      data.slug = uniqueSlug
    }
    
    // Lógica de categoria pai removida - não implementada no schema atual
    
    // Atualizar categoria
    const category = await prisma.category.update({
      where: { id: params.id },
      data,
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
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/categories/[id] - Deletar categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    // Verificar se categoria existe
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        products: true,
      }
    })
    
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }
    
    // Verificar se categoria tem produtos associados
    if (existingCategory.products.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível deletar categoria com produtos associados',
          suggestion: 'Mova os produtos para outra categoria ou desative a categoria'
        },
        { status: 400 }
      )
    }
    
    // Deletar categoria
    await prisma.category.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Categoria deletada com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}