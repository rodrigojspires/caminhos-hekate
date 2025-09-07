import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function POST(_req: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null } as any })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('2FA disable error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
