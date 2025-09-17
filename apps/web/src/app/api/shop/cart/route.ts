import { NextRequest, NextResponse } from 'next/server'
import { getCartFromCookie, setCartToCookie, validateAndNormalizeItems, computeTotals } from '@/lib/shop/cart'
import { prisma } from '@hekate/database'
import { calculateShipping } from '@/lib/shop/shipping'

async function enrich(cart: any) {
  const items = await Promise.all(
    cart.items.map(async (i: any) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: i.variantId },
        include: { product: true },
      })
      return {
        ...i,
        variantName: variant?.name,
        price: variant ? Number(variant.price) : 0,
        comparePrice: variant?.comparePrice != null ? Number(variant.comparePrice) : null,
        stock: variant?.stock ?? 0,
        product: variant?.product ? {
          id: variant.product.id,
          name: variant.product.name,
          slug: variant.product.slug,
          images: Array.isArray(variant.product.images) ? variant.product.images : [],
        } : null,
      }
    })
  )
  return { ...cart, itemsDetailed: items }
}
import type { CartItem } from '@/lib/shop/types'

export async function GET() {
  const cart = getCartFromCookie()
  if (cart.shipping?.cep) {
    try {
      cart.shipping = await calculateShipping(cart.shipping.cep, cart.items)
      setCartToCookie(cart)
    } catch (error) {
      console.error('GET /api/shop/cart shipping recalculation failed', error)
    }
  }
  const totals = await computeTotals(cart)
  const withDetails = await enrich(cart)
  return NextResponse.json({ cart: withDetails, totals })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const withDetails = await enrich(cart)
    return NextResponse.json({ cart: withDetails, totals })
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
    const withDetails = await enrich(cart)
    return NextResponse.json({ cart: withDetails, totals })
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
    const withDetails = await enrich(cart)
    return NextResponse.json({ cart: withDetails, totals })
  } catch (error) {
    console.error('DELETE /api/shop/cart error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
