export type CartItem = {
  productId: string
  variantId: string
  quantity: number
}

export type CartState = {
  items: CartItem[]
  couponCode?: string | null
  shipping?: {
    cep: string
    price: number
    service: string
  } | null
}

export type CartTotals = {
  subtotal: number
  discount: number
  shipping: number
  total: number
}

export type ProductSummary = {
  id: string
  name: string
  slug: string
  image?: string | null
  priceRange: { min: number; max: number }
  category?: { id: string; name: string; slug: string } | null
}

