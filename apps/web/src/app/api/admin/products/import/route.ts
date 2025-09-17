import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const ProductImportSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  comparePrice: z.number().min(0).optional(),
  sku: z.string().min(1, 'SKU é obrigatório'),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  categorySlug: z.string().optional(),
  // Dimensões/peso (variação padrão)
  weight: z.number().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
})

const ImportRequestSchema = z.object({
  products: z.array(ProductImportSchema),
  validateOnly: z.boolean().default(false),
})

function normalizeNumber(val: any): number | undefined {
  if (val === null || val === undefined) return undefined
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const s = val.trim().replace(/\./g, '').replace(',', '.')
    const n = Number(s)
    return isFinite(n) ? n : undefined
  }
  return undefined
}

function normalizeProductAliases(p: any) {
  const out: any = { ...p }
  const map: Record<string, keyof any> = {
    'altura': 'height',
    'largura': 'width',
    'comprimento': 'length',
    'peso': 'weight',
  }
  for (const [k, v] of Object.entries(p)) {
    const keyNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
    if (map[keyNorm as keyof typeof map]) {
      const target = map[keyNorm as keyof typeof map]
      out[target] = normalizeNumber(v)
    }
  }
  // coerção numérica se vier string
  out.weight = normalizeNumber(out.weight)
  out.height = normalizeNumber(out.height)
  out.width = normalizeNumber(out.width)
  out.length = normalizeNumber(out.length)
  return out
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const raw = await request.json()
    const normalized = Array.isArray(raw?.products) ? raw.products.map((p: any) => normalizeProductAliases(p)) : []
    const { products, validateOnly } = ImportRequestSchema.parse({ ...raw, products: normalized })
    
    const results = {
      success: 0,
      errors: 0,
      warnings: 0,
      details: [] as any[],
    }
    
    // Buscar todas as categorias para validação
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })
    
    const categoryMap = new Map(categories.map(cat => [cat.slug, cat]))
    
    // Processar cada produto
    for (let i = 0; i < products.length; i++) {
      const productData = products[i]
      const rowNumber = i + 1
      
      try {
        // Validar categoria se fornecida
        let categoryId: string | undefined
        if (productData.categorySlug) {
          const category = categoryMap.get(productData.categorySlug)
          if (!category) {
            results.details.push({
              row: rowNumber,
              type: 'warning',
              message: `Categoria '${productData.categorySlug}' não encontrada. Produto será criado sem categoria.`,
              data: productData,
            })
            results.warnings++
          } else {
            categoryId = category.id
          }
        }
        
        // Verificar se slug já existe
        const existingProduct = await prisma.product.findUnique({
          where: { slug: productData.slug },
        })
        
        if (existingProduct) {
          results.details.push({
            row: rowNumber,
            type: 'error',
            message: `Produto com slug '${productData.slug}' já existe.`,
            data: productData,
          })
          results.errors++
          continue
        }
        
        // Verificar SKU se fornecido (buscar nas variantes)
        if (productData.sku) {
          const existingSku = await prisma.productVariant.findUnique({
            where: { sku: productData.sku },
          })
          
          if (existingSku) {
            results.details.push({
              row: rowNumber,
              type: 'error',
              message: `Produto com SKU '${productData.sku}' já existe.`,
              data: productData,
            })
            results.errors++
            continue
          }
        }
        
        // Se não é apenas validação, criar o produto
        if (!validateOnly) {
          const newProduct = await prisma.product.create({
            data: {
              name: productData.name,
              slug: productData.slug,
              description: productData.description || '',
              type: productData.type,
              featured: productData.featured,
              active: productData.active,
              categoryId,
              images: [],
              variants: {
                create: {
                  name: 'Padrão',
                  price: productData.price,
                  comparePrice: productData.comparePrice,
                  sku: productData.sku || `${productData.slug}-default`,
                  stock: 0,
                  weight: productData.weight ?? null,
                  dimensions: (productData.height || productData.width || productData.length) ? {
                    height: productData.height,
                    width: productData.width,
                    length: productData.length,
                  } : null,
                  active: true,
                }
              }
            },
          })
          
          results.details.push({
            row: rowNumber,
            type: 'success',
            message: `Produto '${productData.name}' criado com sucesso.`,
            data: productData,
            productId: newProduct.id,
          })
        } else {
          results.details.push({
            row: rowNumber,
            type: 'success',
            message: `Produto '${productData.name}' válido para importação.`,
            data: productData,
          })
        }
        
        results.success++
        
      } catch (error) {
        console.error(`Erro ao processar produto na linha ${rowNumber}:`, error)
        
        results.details.push({
          row: rowNumber,
          type: 'error',
          message: `Erro ao processar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          data: productData,
        })
        results.errors++
      }
    }
    
    return NextResponse.json({
      message: validateOnly ? 'Validação concluída' : 'Importação concluída',
      results,
      summary: {
        total: products.length,
        success: results.success,
        errors: results.errors,
        warnings: results.warnings,
      },
    })
    
  } catch (error) {
    console.error('Erro ao importar produtos:', error)
    
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
