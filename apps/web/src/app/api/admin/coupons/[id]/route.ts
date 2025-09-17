import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth-middleware'

const updateSchema = z.object({
  code: z.string().min(1).transform((s) => s.trim().toUpperCase()).optional(),
  description: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).optional(),
  discountValue: z.number().min(0).optional(),
  minPurchase: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  validFrom: z.string().transform((s) => new Date(s)).optional(),
  validUntil: z.string().transform((s) => new Date(s)).optional(),
  active: z.boolean().optional(),
})

export const GET = withAdminAuth(async (_user, _req: NextRequest, { params }: { params: { id: string } }) => {
  const c = await prisma.coupon.findUnique({ where: { id: params.id } })
  if (!c) return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
  return NextResponse.json({ coupon: c })
})

export const PUT = withAdminAuth(async (_user, req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const updated = await prisma.coupon.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, coupon: updated })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: e.errors }, { status: 400 })
    console.error('PUT /api/admin/coupons/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})

export const DELETE = withAdminAuth(async (_user, _req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    await prisma.coupon.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    console.error('DELETE /api/admin/coupons/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})

