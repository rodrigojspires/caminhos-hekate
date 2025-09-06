import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

// GET /api/email/sends/[id] - Email send details with events
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const send = await emailService.getEmailSend(params.id)
    if (!send) return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 })
    return NextResponse.json(send)
  } catch (error) {
    console.error('Erro ao buscar envio de email:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

