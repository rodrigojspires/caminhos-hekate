import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().optional(),
  comparePrice: z.number().nullable().optional(),
  stock: z.number().int().optional(),
  active: z.boolean().optional(),
  weight: z.number().nullable().optional(),
  dimensions: z
    .object({ height: z.number().optional(), width: z.number().optional(), length: z.number().optional() })
    .partial()
    .optional(),
  attributes: z.record(z.any()).optional(),
})

async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!['ADMIN', 'EDITOR', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: params.id } })
    if (!variant) return NextResponse.json({ error: 'Variante não encontrada' }, { status: 404 })
    return NextResponse.json({ variant })
  } catch (e) {
    console.error('GET /api/admin/variants/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const updateData: any = {
      name: data.name,
      sku: data.sku,
      price: data.price,
      comparePrice: data.comparePrice ?? undefined,
      stock: data.stock,
      active: data.active,
      weight: data.weight ?? undefined,
      attributes: data.attributes,
    }
    if (data.dimensions && (data.dimensions.height || data.dimensions.width || data.dimensions.length)) {
      updateData.dimensions = {
        height: data.dimensions.height,
        width: data.dimensions.width,
        length: data.dimensions.length,
      }
    }
    const variant = await prisma.productVariant.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json({ success: true, variant })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: e.errors }, { status: 400 })
    }
    console.error('PUT /api/admin/variants/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: params.id } })
    if (!variant) return NextResponse.json({ error: 'Variação não encontrada' }, { status: 404 })
    const count = await prisma.productVariant.count({ where: { productId: variant.productId } })
    if (count <= 1) {
      return NextResponse.json({ error: 'Não é possível excluir a última variação do produto' }, { status: 400 })
    }
    await prisma.productVariant.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/admin/variants/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
