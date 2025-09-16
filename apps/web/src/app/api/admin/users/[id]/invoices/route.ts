import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/admin/users/[id]/invoices - Lista faturas (payment_transactions) do usuário
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const invoices = await prisma.paymentTransaction.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: true } },
        order: true,
      }
    })

    return NextResponse.json({ invoices })
  } catch (e) {
    console.error('Erro ao listar invoices do usuário:', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

