"use client"

export const CART_UPDATED_EVENT = 'hekate:cart-updated'

type CartLike = {
  items?: Array<{ quantity?: number }>
  itemsDetailed?: Array<{ quantity?: number }>
}

export function broadcastCartUpdate(cart: CartLike | null | undefined) {
  if (typeof window === 'undefined') return
  const source = Array.isArray(cart?.itemsDetailed) ? cart?.itemsDetailed : cart?.items
  const items = Array.isArray(source) ? source : []
  const count = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
  const detail = { count, cart }
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail }))
}
