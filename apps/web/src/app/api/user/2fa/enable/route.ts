import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const secret = body?.secret as string
    const token = body?.token as string
    if (!secret || !token) return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 })
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { authenticator } = await import('otplib')
    const valid = authenticator.verify({ token, secret })
    if (!valid) return NextResponse.json({ error: 'Código inválido' }, { status: 400 })

    await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorEnabled: true, twoFactorSecret: secret } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('2FA enable error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
