import { NextRequest, NextResponse } from 'next/server'
import { getCartFromCookie, setCartToCookie, computeTotals } from '@/lib/shop/cart'
import { calculateShipping } from '@/lib/shop/shipping'
import { enrichCartWithDetails } from '@/lib/shop/enrich-cart'

export async function POST(request: NextRequest) {
  try {
    const { cep, serviceId } = await request.json()
    if (!cep) return NextResponse.json({ error: 'CEP obrigatório' }, { status: 400 })
    const cart = getCartFromCookie()
    const shipping = await calculateShipping(
      cep,
      cart.items,
      serviceId || cart.shipping?.serviceId,
    )
    cart.shipping = shipping
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    const withDetails = await enrichCartWithDetails(cart)
    return NextResponse.json({ cart: withDetails, totals })
  } catch (error) {
    console.error('POST /api/shop/shipping error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
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
