import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { authenticator } from 'otplib'

function generateBackupCodes(count = 8) {
  const codes: string[] = []
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 10; j++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    codes.push(code)
  }
  return codes
}

// POST /api/auth/2fa/enable { token }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const token = body?.token as string | undefined
  if (!token) return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorSecret: true } })
  if (!user?.twoFactorSecret) return NextResponse.json({ error: 'Setup não iniciado' }, { status: 400 })

  const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
  if (!isValid) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })

  const backupCodes = generateBackupCodes()
  await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorEnabled: true, twoFactorBackupCodes: backupCodes } })
  return NextResponse.json({ success: true, backupCodes })
}

