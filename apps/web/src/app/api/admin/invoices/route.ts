import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/admin/invoices?status=&q=
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const q = searchParams.get('q') || undefined

    const where: any = {}
    if (status) where.status = status
    if (q) {
      where.OR = [
        { userId: { contains: q } },
        { providerPaymentId: { contains: q } },
        { provider: { contains: q } },
      ]
    }

    const invoices = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { subscription: { include: { plan: true } } }
    })

    return NextResponse.json({ invoices })
  } catch (e) {
    console.error('Erro ao listar invoices:', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

