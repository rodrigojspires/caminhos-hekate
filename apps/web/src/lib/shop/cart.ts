import { cookies } from 'next/headers'
import { prisma } from '@hekate/database'
import type { CartItem, CartState, CartTotals, CartShipping } from './types'

const CART_COOKIE = 'hekate_cart'

function normalizeShipping(raw: any): CartShipping | null {
  if (!raw || typeof raw !== 'object') return null

  const serviceId = typeof raw.serviceId === 'string' && raw.serviceId.trim().length > 0
    ? raw.serviceId.trim()
    : raw.service || raw.serviceId || ''

  if (!raw.cep || !serviceId) {
    // backwards compatibility: previous structure { cep, price, service }
    if (raw.cep && typeof raw.price === 'number' && raw.service) {
      return {
        cep: String(raw.cep),
        serviceId: `${raw.service}`,
        service: String(raw.service),
        price: Number(raw.price) || 0,
        carrier: raw.carrier ? String(raw.carrier) : null,
        deliveryDays: typeof raw.deliveryDays === 'number' ? raw.deliveryDays : null,
        options: Array.isArray(raw.options) ? raw.options : undefined,
      }
    }
    return null
  }

  return {
    cep: String(raw.cep),
    serviceId,
    service: String(raw.service || serviceId),
    price: Number(raw.price) || 0,
    carrier: raw.carrier ? String(raw.carrier) : raw.carrier ?? null,
    deliveryDays: typeof raw.deliveryDays === 'number' ? raw.deliveryDays : null,
    options: Array.isArray(raw.options)
      ? raw.options.map((opt: any) => ({
          id: String(opt.id),
          service: String(opt.service),
          price: Number(opt.price) || 0,
          carrier: opt.carrier ? String(opt.carrier) : opt.carrier ?? null,
          deliveryDays: typeof opt.deliveryDays === 'number' ? opt.deliveryDays : null,
        }))
      : undefined,
  }
}

export function getCartFromCookie(): CartState {
  try {
    const store = cookies()
    const raw = store.get(CART_COOKIE)?.value
    if (!raw) return { items: [], couponCode: null, shipping: null }
    const parsed = JSON.parse(raw)
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      couponCode: parsed.couponCode || null,
      shipping: normalizeShipping(parsed.shipping),
    }
  } catch {
    return { items: [], couponCode: null, shipping: null }
  }
}

export function setCartToCookie(cart: CartState) {
  const store = cookies()
  store.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function validateAndNormalizeItems(items: CartItem[]) {
  // Ensure items exist and have sufficient stock
  const result: CartItem[] = []
  for (const item of items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: true },
    })
    if (!variant || !variant.active || !variant.product.active) continue
    const stock = variant.stock
    const qty = Math.max(1, Math.min(item.quantity, stock))
    if (qty <= 0) continue
    result.push({ productId: variant.productId, variantId: variant.id, quantity: qty })
  }
  return result
}

export async function computeTotals(cart: CartState): Promise<CartTotals> {
  let subtotal = 0
  const variantCache = new Map<string, { price: number }>()
  for (const item of cart.items) {
    let variant = variantCache.get(item.variantId)
    if (!variant) {
      const dbVariant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
      if (!dbVariant) continue
      variant = { price: Number(dbVariant.price) }
      variantCache.set(item.variantId, variant)
    }
    subtotal += variant.price * item.quantity
  }

  // Coupon
  let discount = 0
  if (cart.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: cart.couponCode } })
    const now = new Date()
    if (
      coupon &&
      coupon.active &&
      coupon.validFrom <= now &&
      coupon.validUntil >= now &&
      (!coupon.minPurchase || Number(coupon.minPurchase) <= subtotal)
    ) {
      const usageCount = await prisma.couponUsage.count({ where: { couponId: coupon.id } })
      if (!coupon.usageLimit || usageCount < coupon.usageLimit) {
        if (coupon.discountType === 'PERCENT') {
          discount = (Number(coupon.discountValue) / 100) * subtotal
        } else {
          discount = Number(coupon.discountValue)
        }
        if (coupon.maxDiscount) {
          discount = Math.min(discount, Number(coupon.maxDiscount))
        }
      }
    }
  }

  const shipping = cart.shipping?.price ? Number(cart.shipping.price) : 0
  const total = Math.max(0, subtotal - discount + shipping)
  return { subtotal, discount, shipping, total }
}

export function clearCart() {
  const store = cookies()
  store.set(CART_COOKIE, JSON.stringify({ items: [], couponCode: null, shipping: null }), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}
