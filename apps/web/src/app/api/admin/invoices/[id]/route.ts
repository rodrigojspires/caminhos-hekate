import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { requireAdmin } from '@/lib/require-admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const invoice = await prisma.paymentTransaction.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
    }

    await prisma.paymentTransaction.delete({
      where: { id: invoice.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir fatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
