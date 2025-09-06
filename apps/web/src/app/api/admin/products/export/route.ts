import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const ExportSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  categoryId: z.string().optional(),
  active: z.boolean().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = ExportSchema.parse(params)
    
    // Construir filtros
    const where: any = {}
    
    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId
    }
    
    if (validatedParams.active !== undefined) {
      where.active = validatedParams.active
    }
    
    if (validatedParams.type) {
      where.type = validatedParams.type
    }
    
    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.createdAt = {}
      if (validatedParams.dateFrom) {
        where.createdAt.gte = new Date(validatedParams.dateFrom)
      }
      if (validatedParams.dateTo) {
        where.createdAt.lte = new Date(validatedParams.dateTo)
      }
    }
    
    // Buscar produtos
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            sku: true,
            price: true,
            comparePrice: true,
            active: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1, // Pegar apenas a primeira variante para dados básicos
        },
        _count: {
          select: {
            orderItems: true,
            variants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    if (validatedParams.format === 'csv') {
      // Gerar CSV
      const csvHeaders = [
        'ID',
        'Nome',
        'Slug',
        'Descrição',
        'Tipo',
        'Preço (Primeira Variante)',
        'Preço Comparativo (Primeira Variante)',
        'SKU (Primeira Variante)',
        'Ativo',
        'Em Destaque',
        'Categoria',
        'Vendas',
        'Variações',
        'Data de Criação',
        'Última Atualização',
      ]
      
      const csvRows = products.map(product => {
        const firstVariant = product.variants[0]
        return [
          product.id,
          `"${product.name}"`,
          product.slug,
          `"${product.description || ''}"`,
          product.type,
          firstVariant?.price || '',
          firstVariant?.comparePrice || '',
          firstVariant?.sku || '',
          product.active ? 'Sim' : 'Não',
          product.featured ? 'Sim' : 'Não',
          product.category?.name || '',
          product._count.orderItems,
          product._count.variants,
          product.createdAt.toISOString(),
          product.updatedAt.toISOString(),
        ]
      })
      
      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="produtos_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else {
      // Para Excel, retornar JSON que será processado no frontend
      const excelData = products.map(product => {
        const firstVariant = product.variants[0]
        return {
          ID: product.id,
          Nome: product.name,
          Slug: product.slug,
          Descrição: product.description || '',
          Tipo: product.type,
          'Preço (Primeira Variante)': firstVariant?.price || '',
          'Preço Comparativo (Primeira Variante)': firstVariant?.comparePrice || '',
          'SKU (Primeira Variante)': firstVariant?.sku || '',
          Ativo: product.active ? 'Sim' : 'Não',
          'Em Destaque': product.featured ? 'Sim' : 'Não',
          Categoria: product.category?.name || '',
          Vendas: product._count.orderItems,
          Variações: product._count.variants,
          'Data de Criação': product.createdAt.toISOString(),
          'Última Atualização': product.updatedAt.toISOString(),
        }
      })
      
      return NextResponse.json({
        data: excelData,
        filename: `produtos_${new Date().toISOString().split('T')[0]}.xlsx`,
      })
    }
    
  } catch (error) {
    console.error('Erro ao exportar produtos:', error)
    
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