import { NextRequest, NextResponse } from 'next/server'
import { getCartFromCookie, setCartToCookie, validateAndNormalizeItems, computeTotals } from '@/lib/shop/cart'
import type { CartItem } from '@/lib/shop/types'

export async function GET() {
  const cart = getCartFromCookie()
  const totals = await computeTotals(cart)
  return NextResponse.json({ cart, totals })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, variantId, quantity } = body as CartItem
    if (!variantId || !quantity) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const cart = getCartFromCookie()
    const existing = cart.items.find((i) => i.variantId === variantId)
    if (existing) existing.quantity += Number(quantity)
    else cart.items.push({ productId, variantId, quantity: Number(quantity) })
    cart.items = await validateAndNormalizeItems(cart.items)
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    return NextResponse.json({ cart, totals })
  } catch (error) {
    console.error('POST /api/shop/cart error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items: CartItem[] }
    const cart = getCartFromCookie()
    cart.items = await validateAndNormalizeItems(items || [])
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    return NextResponse.json({ cart, totals })
  } catch (error) {
    console.error('PUT /api/shop/cart error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { variantId } = await request.json()
    const cart = getCartFromCookie()
    cart.items = cart.items.filter((i) => i.variantId !== variantId)
    setCartToCookie(cart)
    const totals = await computeTotals(cart)
    return NextResponse.json({ cart, totals })
  } catch (error) {
    console.error('DELETE /api/shop/cart error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

