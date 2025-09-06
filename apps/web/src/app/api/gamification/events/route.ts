import { NextResponse } from 'next/server'

// GET /api/gamification/events - Minimal competitions listing (placeholder)
export async function GET() {
  const now = new Date()
  const sample = [
    {
      id: 'seasonal-1',
      name: 'Desafio de Estudo — Setembro',
      description: 'Acumule pontos concluindo lições e quizzes durante o mês.',
      startsAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endsAt: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      status: 'ACTIVE',
    },
  ]
  return NextResponse.json(sample)
}

