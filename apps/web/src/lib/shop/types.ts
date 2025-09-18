export type CartItem = {
  productId: string
  variantId: string
  quantity: number
}

export type CartState = {
  items: CartItem[]
  couponCode?: string | null
  shipping?: CartShipping | null
}

export type CartTotals = {
  subtotal: number
  discount: number
  shipping: number
  total: number
}

export type ShippingOption = {
  id: string
  service: string
  price: number
  carrier?: string | null
  deliveryDays?: number | null
}

export type CartShipping = {
  cep: string
  serviceId: string
  service: string
  price: number
  carrier?: string | null
  deliveryDays?: number | null
  options?: ShippingOption[]
}

export type ProductSummary = {
  id: string
  name: string
  slug: string
  image?: string | null
  priceRange: { min: number; max: number }
  category?: { id: string; name: string; slug: string } | null
}
