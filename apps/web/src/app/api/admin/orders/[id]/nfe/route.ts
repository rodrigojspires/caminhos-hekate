import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id || !['ADMIN','EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    const number = `NFE-${new Date().getFullYear()}-${order.id.slice(-6).toUpperCase()}`
    const url = `https://nfe.example.com/${number}`
    const metadata = Object.assign({}, order.metadata || {}, { nfe: { status: 'ISSUED', number, url, issuedAt: new Date().toISOString() } })
    await prisma.order.update({ where: { id: order.id }, data: { metadata } })
    return NextResponse.json({ success: true, nfe: (metadata as any).nfe })
  } catch (e) {
    console.error('POST /api/admin/orders/[id]/nfe error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
