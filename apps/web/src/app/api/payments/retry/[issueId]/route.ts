import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams { params: { issueId: string } }

// POST /api/payments/retry/[issueId] - tenta reprocessar um pagamento com falha (simples)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tx = await prisma.paymentTransaction.findUnique({ where: { id: params.issueId } })
    if (!tx) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }
    if (tx.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    // Atualiza status para PENDING como reprocessamento fictício
    await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: 'PENDING' as any } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao reprocessar pagamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

