import { NextRequest, NextResponse } from 'next/server'
import { getCartFromCookie, setCartToCookie, computeTotals } from '@/lib/shop/cart'
import { calculateShipping } from '@/lib/shop/shipping'

export async function POST(request: NextRequest) {
  try {
    const { cep } = await request.json()
    if (!cep) return NextResponse.json({ error: 'CEP obrigatório' }, { status: 400 })
    const cart = getCartFromCookie()
    const shipping = await calculateShipping(cep, cart.items)
    cart.shipping = shipping
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    return NextResponse.json({ cart, totals })
  } catch (error) {
    console.error('POST /api/shop/shipping error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

