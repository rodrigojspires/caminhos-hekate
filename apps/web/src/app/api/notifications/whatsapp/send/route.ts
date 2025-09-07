import { NextRequest, NextResponse } from 'next/server'
import { enqueue } from '@/lib/queues/bull'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.to || !data.template) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }
    await enqueue('whatsapp', 'send-whatsapp', data)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/notifications/whatsapp/send error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

