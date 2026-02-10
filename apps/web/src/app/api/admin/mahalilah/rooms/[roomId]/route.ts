import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams {
  params: { roomId: string }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true, code: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    await prisma.mahaLilahRoom.delete({
      where: { id: room.id }
    })

    return NextResponse.json({
      message: `Sala ${room.code} excluída com sucesso.`
    })
  } catch (error) {
    console.error('Erro ao excluir sala Maha Lilah (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
