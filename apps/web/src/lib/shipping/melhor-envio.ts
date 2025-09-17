import type { CartItem } from '@/lib/shop/types'
import { prisma } from '@hekate/database'

// Integração simplificada com Melhor Envio: calcula frete com base nas dimensões/peso dos itens.
// Requer envs: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_FROM_CEP
// Opcional: MELHOR_ENVIO_SERVICE_IDS (csv de IDs de serviço), MELHOR_ENVIO_SANDBOX="1"

export async function calculateShippingViaMelhorEnvio(cep: string, items: CartItem[]) {
  const token = process.env.MELHOR_ENVIO_TOKEN
  const fromCep = process.env.MELHOR_ENVIO_FROM_CEP
  if (!token || !fromCep) throw new Error('MELHOR_ENVIO_TOKEN/MELHOR_ENVIO_FROM_CEP ausentes')

  // Montar pacotes simples: 1 pacote por item (aproximação)
  const packages: Array<{ height: number; width: number; length: number; weight: number; insurance_value: number; quantity: number }>[] = []
  const payloadItems: any[] = []

  for (const ci of items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: ci.variantId } })
    if (!variant) continue
    const dims = (variant.dimensions as any) || {}
    const height = Number(dims?.height || 4) // cm mínimos
    const width = Number(dims?.width || 12)
    const length = Number(dims?.length || 16)
    const weight = Math.max(0.05, Number(variant.weight || 0.2)) // kg mínimos
    const price = Number(variant.price || 0)
    payloadItems.push({ height, width, length, weight, insurance_value: price, quantity: ci.quantity })
  }

  if (!payloadItems.length) return { cep, price: 0, service: 'Sem itens' }

  const endpointBase = process.env.MELHOR_ENVIO_SANDBOX === '1'
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://www.melhorenvio.com.br'
  const servicesCsv = process.env.MELHOR_ENVIO_SERVICE_IDS || ''
  const services = servicesCsv.split(',').map(s => s.trim()).filter(Boolean)

  const body = {
    from: { postal_code: fromCep },
    to: { postal_code: cep },
    products: payloadItems.map(p => ({
      height: p.height,
      width: p.width,
      length: p.length,
      weight: p.weight, // em kg
      insurance_value: p.insurance_value,
      quantity: p.quantity,
    })),
    services: services.length ? services : undefined,
  }

  const res = await fetch(`${endpointBase}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`MelhorEnvio ${res.status}: ${txt}`)
  }

  const quotes: any[] = await res.json()
  if (!Array.isArray(quotes) || quotes.length === 0) throw new Error('Sem cotações do Melhor Envio')
  // Pega a menor cotação
  const best = quotes.reduce((min, q) => (q.price < min.price ? q : min), quotes[0])
  return { cep, price: Number(best.price), service: `${best.company?.name || 'ME'} - ${best.name || 'serviço'}` }
}

