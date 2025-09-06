import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/payments/history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
    const offset = (page - 1) * limit
    const userId = searchParams.get('userId') || session.user.id
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const method = searchParams.get('method') || 'all'
    // period could further filter by createdAt; for now ignored

    // Permissão: somente o próprio ou admin
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const where: any = { userId }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' as const } },
        { id: { contains: search, mode: 'insensitive' as const } },
      ]
    }
    if (status !== 'all') where.status = status
    if (method !== 'all') where.paymentMethod = method

    const [payments, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { subscription: { select: { id: true, plan: { select: { name: true } } } } }
      }),
      prisma.paymentTransaction.count({ where })
    ])

    return NextResponse.json({
      payments: payments.map(p => ({
        id: p.id,
        amount: Number(p.amount || 0),
        status: p.status as any,
        paymentMethod: (p.paymentMethod as any) || 'PIX',
        provider: (p.provider as any) || 'MERCADOPAGO',
        description: ((p.metadata as any)?.description) || '',
        invoiceUrl: (p as any).boletoUrl || ((p.metadata as any)?.invoiceUrl) || undefined,
        receiptUrl: ((p.metadata as any)?.receiptUrl) || undefined,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString(),
        subscription: (p as any).subscription ? { id: (p as any).subscription.id, plan: { name: (p as any).subscription.plan?.name || '' } } : undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
