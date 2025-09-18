import type { CartItem, CartShipping, ShippingOption } from './types'
import { prisma } from '@hekate/database'
import { calculateShippingViaMelhorEnvio } from '@/lib/shipping/melhor-envio'

// Placeholder shipping calculator: flat table by region and weight
export async function calculateShipping(
  cep: string,
  items: CartItem[],
  preferredServiceId?: string | null,
): Promise<CartShipping> {
  // Determina quais itens são físicos (produto.type === 'PHYSICAL')
  const detailed = await Promise.all(items.map(async (i) => {
    const variant = await prisma.productVariant.findUnique({ where: { id: i.variantId }, include: { product: true } })
    return { i, variant }
  }))
  const physical = detailed.filter(d => d.variant?.product?.type === 'PHYSICAL')

  // Se não houver itens físicos, frete é zero
  if (physical.length === 0) {
    const digitalOption: ShippingOption = {
      id: 'digital',
      service: 'Digital (sem frete)',
      price: 0,
      carrier: null,
      deliveryDays: null,
    }
    return {
      cep,
      serviceId: digitalOption.id,
      service: digitalOption.service,
      price: digitalOption.price,
      carrier: digitalOption.carrier,
      deliveryDays: digitalOption.deliveryDays,
      options: [digitalOption],
    }
  }

  // Se houver credenciais do Melhor Envio, tenta cotar por lá com itens físicos
  if (process.env.MELHOR_ENVIO_TOKEN) {
    try {
      const me = await calculateShippingViaMelhorEnvio(
        cep,
        physical.map(d => d.i),
        preferredServiceId,
      )
      if (me && typeof me.price === 'number') {
        return me
      }
    } catch (e) {
      console.warn('[shipping] Melhor Envio falhou, usando fallback:', e)
    }
  }

  // Fallback interno simples baseado em peso total e região por CEP (somente itens físicos)
  let totalWeight = 0 // kg
  for (const d of physical) {
    const weight = d.variant?.weight || 0.2
    totalWeight += weight * d.i.quantity
  }
  const region = regionFromCep(cep)
  const base = region === 'N' ? 29.9 : region === 'S' ? 19.9 : region === 'SE' ? 14.9 : 24.9
  const extra = Math.max(0, totalWeight - 1) * 5
  const price = Number((base + extra).toFixed(2))
  const options: ShippingOption[] = [
    {
      id: `pac-${region}`,
      service: 'PAC - Correios',
      price: Number(price.toFixed(2)),
      carrier: 'Correios',
      deliveryDays: 6,
    },
    {
      id: `sedex-${region}`,
      service: 'SEDEX - Correios',
      price: Number((price + 12 + extra * 0.5).toFixed(2)),
      carrier: 'Correios',
      deliveryDays: 3,
    },
    {
      id: `express-${region}`,
      service: 'Jadlog Expresso',
      price: Number((price + 8 + extra * 0.3).toFixed(2)),
      carrier: 'Jadlog',
      deliveryDays: 5,
    },
  ]

  const selected = preferredServiceId
    ? options.find((opt) => opt.id === preferredServiceId) || options[0]
    : options[0]

  return {
    cep,
    serviceId: selected.id,
    service: selected.service,
    price: selected.price,
    carrier: selected.carrier,
    deliveryDays: selected.deliveryDays,
    options,
  }
}

function regionFromCep(cep: string) {
  const n = (cep || '').replace(/\D/g, '')
  if (n.length < 2) return 'BR'
  const d1 = parseInt(n.slice(0, 2), 10)
  // Rough segmentation by CEP prefix
  if ([10, 11, 12, 13, 14, 15].some((p) => d1 === p)) return 'SE' // SP
  if ([20, 21, 22, 23, 24].some((p) => d1 === p)) return 'SE' // RJ
  if ([90, 91, 92, 93, 94, 95, 96, 97, 98, 99].some((p) => d1 === p)) return 'S' // Sul
  if ([60, 61, 62, 63, 64].some((p) => d1 === p)) return 'N' // Norte
  return 'CO'
}
