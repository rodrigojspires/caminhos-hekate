import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/queues/bull'

export async function GET(_req: NextRequest) {
  try {
    const conn = getRedisConnection()
    const names = ['email','whatsapp','reminders'] as const
    const stats = await Promise.all(
      names.map(async (name) => {
        const q = new Queue(name, { connection: conn })
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
