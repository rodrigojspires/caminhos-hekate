import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/payments/invoice/current - baixa a fatura corrente (simples)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Busca a última transação paga do usuário
    const lastPaid = await prisma.paymentTransaction.findFirst({
      where: { userId: session.user.id, status: 'COMPLETED' as any },
      orderBy: { paidAt: 'desc' }
    })

    const meta: any = lastPaid?.metadata || {}
    const url = (lastPaid as any)?.boletoUrl || meta.invoiceUrl || meta.receiptUrl || meta.paymentLink || undefined
    if (url) return NextResponse.redirect(url)

    // Gera um arquivo simples (texto) como fallback
    const content = `FATURA\nUsuário: ${session.user.id}\nData: ${new Date().toISOString()}\nValor: ${lastPaid ? Number(lastPaid.amount || 0).toFixed(2) : '0.00'}\n`;
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="fatura-atual.pdf"'
      }
    })
  } catch (error) {
    console.error('Erro ao gerar fatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
