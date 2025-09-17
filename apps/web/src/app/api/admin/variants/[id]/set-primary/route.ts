import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN','EDITOR','MODERATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const v = await prisma.productVariant.findUnique({ where: { id: params.id } })
    if (!v) return NextResponse.json({ error: 'Variação não encontrada' }, { status: 404 })
    const siblings = await prisma.productVariant.findMany({ where: { productId: v.productId } })
    // Atualiza todos: primary=false, e a escolhida primary=true
    for (const s of siblings) {
      const attrs = (s.attributes as any) || {}
      const nextAttrs = { ...attrs, primary: s.id === v.id }
      await prisma.productVariant.update({ where: { id: s.id }, data: { attributes: nextAttrs } })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('set-primary error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

