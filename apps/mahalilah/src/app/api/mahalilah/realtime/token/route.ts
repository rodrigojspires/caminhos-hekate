import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import jwt from 'jsonwebtoken'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const secret = process.env.MAHALILAH_SOCKET_SECRET || process.env.NEXTAUTH_SECRET

    if (!secret) {
      return NextResponse.json({ error: 'Secret não configurado' }, { status: 500 })
    }

    const token = jwt.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role
      },
      secret,
      { expiresIn: '2h' }
    )

    return NextResponse.json({
      token,
      wsUrl: process.env.NEXT_PUBLIC_MAHALILAH_WS_URL || 'http://localhost:4010'
    })
  } catch (error) {
    console.error('Erro ao gerar token realtime:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
