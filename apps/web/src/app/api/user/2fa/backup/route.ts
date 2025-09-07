import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

function generateBackupCodes(n = 8) {
  const codes: string[] = []
  for (let i = 0; i < n; i++) {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase()
    codes.push(code)
  }
  return codes
}

export async function POST(_req: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const codes = generateBackupCodes()
    await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorBackupCodes: codes } })
    return NextResponse.json({ success: true, codes })
  } catch (e) {
    console.error('2FA backup error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
