import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getCartFromCookie, setCartToCookie, computeTotals } from '@/lib/shop/cart'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    if (!code) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })
    const coupon = await prisma.coupon.findUnique({ where: { code } })
    const now = new Date()
    if (!coupon || !coupon.active || coupon.validFrom > now || coupon.validUntil < now) {
      return NextResponse.json({ error: 'Cupom inválido' }, { status: 400 })
    }
    if (coupon.usageLimit != null) {
      const usageCount = await prisma.couponUsage.count({ where: { couponId: coupon.id } })
      if (usageCount >= coupon.usageLimit) {
        return NextResponse.json({ error: 'Cupom atingiu o limite de uso' }, { status: 400 })
      }
    }
    const cart = getCartFromCookie()
    cart.couponCode = code
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    return NextResponse.json({ cart, totals })
  } catch (error) {
    console.error('POST /api/shop/coupon error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE() {
  const cart = getCartFromCookie()
  cart.couponCode = null
  setCartToCookie(cart)
  const totals = await computeTotals(cart)
  return NextResponse.json({ cart, totals })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export async function HEAD() {
  return NextResponse.json(null, { status: 405 })
}
