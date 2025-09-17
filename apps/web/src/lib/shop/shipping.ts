import type { CartItem } from './types'
import { prisma } from '@hekate/database'
import { calculateShippingViaMelhorEnvio } from '@/lib/shipping/melhor-envio'

// Placeholder shipping calculator: flat table by region and weight
export async function calculateShipping(cep: string, items: CartItem[]) {
  // Se houver credenciais do Melhor Envio, tenta cotar por lá
  if (process.env.MELHOR_ENVIO_TOKEN) {
    try {
      const me = await calculateShippingViaMelhorEnvio(cep, items)
      if (me && typeof me.price === 'number') return me
    } catch (e) {
      console.warn('[shipping] Melhor Envio falhou, usando fallback:', e)
    }
  }

  // Fallback interno simples baseado em peso total e região por CEP
  let totalWeight = 0 // kg
  for (const item of items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
    const weight = variant?.weight || 0.2
    totalWeight += weight * item.quantity
  }
  const region = regionFromCep(cep)
  const base = region === 'N' ? 29.9 : region === 'S' ? 19.9 : region === 'SE' ? 14.9 : 24.9
  const extra = Math.max(0, totalWeight - 1) * 5
  const price = Number((base + extra).toFixed(2))
  return { cep, price, service: `Envio padrão (${region})` }
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
