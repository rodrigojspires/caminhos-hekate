import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@hekate/database'

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

    const where: Prisma.PaymentTransactionWhereInput = { userId }

    if (search) {
      // Campos válidos para busca textual: id, externalId, providerPaymentId, paymentMethod
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { providerPaymentId: { contains: search, mode: 'insensitive' } },
        { paymentMethod: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status !== 'all') {
      // Atribui diretamente; validação pode ser feita pela UI
      where.status = status as any
    }

    if (method !== 'all') where.paymentMethod = method

    const [payments, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          subscription: { select: { id: true, plan: { select: { name: true } } } },
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ])

    interface PaymentMetadata {
      description?: string;
      invoiceUrl?: string;
      receiptUrl?: string;
      lineItems?: Array<{ type?: string; label: string; amount: number }>;
      [key: string]: unknown;
    }

    return NextResponse.json({
      payments: payments.map((p) => {
        const metadata = p.metadata as PaymentMetadata | null
        return {
          id: p.id,
          amount: Number(p.amount || 0),
          status: p.status,
          paymentMethod: p.paymentMethod || 'PIX',
          provider: p.provider || 'MERCADOPAGO',
          description: metadata?.description || '',
          invoiceUrl: (p as any).boletoUrl || metadata?.invoiceUrl || undefined,
          receiptUrl: metadata?.receiptUrl || undefined,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt?.toISOString(),
          lineItems: Array.isArray(metadata?.lineItems) ? metadata?.lineItems : undefined,
          subscription: p.subscription
            ? { id: p.subscription.id, plan: { name: p.subscription.plan?.name || '' } }
            : undefined,
        }
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
