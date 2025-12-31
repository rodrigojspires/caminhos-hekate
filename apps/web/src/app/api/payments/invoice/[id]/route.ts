import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: params.id }
    })

    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Fatura não está pendente' }, { status: 400 })
    }

    const amount = Number(transaction.amount || 0)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const metadata = (transaction.metadata as any) || {}
    const description = metadata.description || 'Fatura mensal'

    const { MercadoPagoService } = await import('@/lib/payments/mercadopago')
    const mp = new MercadoPagoService()

    const preference = await mp.createPreference({
      title: description,
      quantity: 1,
      unit_price: amount,
      currency_id: 'BRL',
      description,
      external_reference: transaction.id,
      notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/minhas-faturas?status=success`,
        failure: `${process.env.NEXTAUTH_URL}/minhas-faturas?status=failure`,
        pending: `${process.env.NEXTAUTH_URL}/minhas-faturas?status=pending`,
      },
      metadata: {
        transaction_id: transaction.id,
        user_id: session.user.id,
        created_via: 'invoice-transaction-route'
      }
    })

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        provider: 'MERCADOPAGO',
        providerPaymentId: preference.id,
        metadata: {
          ...metadata,
          paymentLink: preference.init_point
        }
      }
    })

    return NextResponse.json({ success: true, paymentUrl: preference.init_point })
  } catch (error) {
    console.error('Erro ao gerar cobrança da fatura:', error)
    return NextResponse.json({ error: 'Erro ao gerar cobrança' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
