import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth-middleware'

const couponCreateSchema = z.object({
  code: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  discountValue: z.number().min(0),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().positive().optional(),
  validFrom: z.string().transform((s) => new Date(s)),
  validUntil: z.string().transform((s) => new Date(s)),
  active: z.boolean().optional().default(true),
})

const querySchema = z.object({
  page: z.string().transform((v) => parseInt(v) || 1).optional().default('1'),
  limit: z.string().transform((v) => Math.min(parseInt(v) || 20, 100)).optional().default('20'),
  search: z.string().optional(),
  active: z.string().optional(),
})

export const GET = withAdminAuth(async (_user, req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = querySchema.parse(Object.fromEntries(searchParams))
    const where: any = {}
    if (q.search) {
      where.OR = [
        { code: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    if (q.active === 'true') where.active = true
    if (q.active === 'false') where.active = false

    const page = Number(q.page)
    const limit = Number(q.limit)
    const [rows, total] = await Promise.all([
      prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.coupon.count({ where })
    ])
    return NextResponse.json({ coupons: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (e) {
    console.error('GET /api/admin/coupons error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (_user, req: NextRequest) => {
  try {
    const body = await req.json()
    const data = couponCreateSchema.parse(body)
    const created = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        active: data.active,
      }
    })
    return NextResponse.json({ success: true, coupon: created }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: e.errors }, { status: 400 })
    }
    console.error('POST /api/admin/coupons error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})

