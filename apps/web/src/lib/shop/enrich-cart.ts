import { prisma } from '@hekate/database'

import type { CartItem, CartState } from './types'

export type EnrichedCart = CartState & {
  itemsDetailed: Array<
    CartItem & {
      variantName?: string | null
      price: number
      comparePrice: number | null
      stock: number | null
      product: {
        id: string
        name: string
        slug: string | null
        images: string[]
        type: string | null
      } | null
    }
  >
}

export async function enrichCartWithDetails(cart: CartState): Promise<EnrichedCart> {
  const itemsDetailed = await Promise.all(
    cart.items.map(async (item) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      })

      const price = variant ? Number(variant.price) : 0
      const comparePrice = variant?.comparePrice != null ? Number(variant.comparePrice) : null

      return {
        ...item,
        variantName: variant?.name,
        price,
        comparePrice,
        stock: variant?.stock ?? null,
        product: variant?.product
          ? {
              id: variant.product.id,
              name: variant.product.name,
              slug: variant.product.slug,
              images: Array.isArray(variant.product.images) ? variant.product.images : [],
              type: variant.product.type ?? null,
            }
          : null,
      }
    })
  )

  return {
    ...cart,
    itemsDetailed,
  }
}
