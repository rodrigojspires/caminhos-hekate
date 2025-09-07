import { NextRequest, NextResponse } from 'next/server'
import { enqueue } from '@/lib/queues/bull'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    const delayUntil = data.sendAt ? new Date(data.sendAt) : undefined
    await enqueue('reminders', 'reminder', data, delayUntil ? { delayUntil } : undefined)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/notifications/reminders error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

