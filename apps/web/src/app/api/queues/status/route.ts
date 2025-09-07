import { NextRequest, NextResponse } from 'next/server'
import { queues } from '@/lib/queues/bull'

export async function GET(_req: NextRequest) {
  try {
    const stats = await Promise.all(
      (Object.keys(queues) as Array<keyof typeof queues>).map(async name => {
        const q = queues[name]
        const counts = await q.getJobCounts('waiting','active','completed','failed','delayed','paused')
        return { name, counts }
      })
    )
    return NextResponse.json({ stats })
  } catch (e) {
    console.error('GET /api/queues/status error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

