import { NextResponse } from 'next/server'
import { getPlanConfig } from '@/lib/mahalilah/plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const plans = await getPlanConfig()
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Erro ao carregar catálogo de planos Maha Lilah:', error)
    return NextResponse.json(
      { error: 'Catálogo de planos indisponível no momento.' },
      { status: 500 }
    )
  }
}
