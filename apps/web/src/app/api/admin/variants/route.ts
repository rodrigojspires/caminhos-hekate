import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@hekate/database'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth-middleware'

const createVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  comparePrice: z.number().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  weight: z.number().nullable().optional(),
  dimensions: z
    .object({ height: z.number().optional(), width: z.number().optional(), length: z.number().optional() })
    .partial()
    .optional(),
  attributes: z.record(z.any()).optional(),
})

export const POST = withAdminAuth(async (_user, req: NextRequest) => {
  try {
    const body = await req.json()
    const data = createVariantSchema.parse(body)

    // Verifica produto existente
    const product = await prisma.product.findUnique({ where: { id: data.productId } })
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const variant = await prisma.productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        name: data.name,
        price: data.price,
        comparePrice: data.comparePrice ?? null,
        stock: data.stock,
        active: data.active,
        weight: data.weight ?? null,
        dimensions: data.dimensions
          ? {
              height: data.dimensions.height ?? null,
              width: data.dimensions.width ?? null,
              length: data.dimensions.length ?? null,
            }
          : Prisma.JsonNull,
        attributes: data.attributes,
      }
    })

    return NextResponse.json({ success: true, variant }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: e.errors }, { status: 400 })
    }
    console.error('POST /api/admin/variants error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})
