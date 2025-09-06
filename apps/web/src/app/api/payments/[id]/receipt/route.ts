import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams {
  params: { id: string }
}

// GET /api/payments/[id]/receipt - Redireciona/baixa comprovante
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, metadata: true, boletoUrl: true, qrCode: true }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    if (payment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const meta: any = payment.metadata || {}
    const url = payment.boletoUrl || meta.invoiceUrl || meta.receiptUrl || meta.paymentLink || undefined
    if (!url) {
      return NextResponse.json({ error: 'Comprovante não disponível' }, { status: 404 })
    }

    // Redireciona para a URL do comprovante/nota
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Erro ao gerar comprovante:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
