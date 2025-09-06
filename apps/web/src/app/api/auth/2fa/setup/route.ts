import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { authenticator } from 'otplib'

// POST /api/auth/2fa/setup - inicia configuração (gera secret e otpauth URL)
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const secret = authenticator.generateSecret()
  const service = process.env.TWOFA_ISSUER || 'Caminhos de Hekate'
  const label = `${service}:${session.user.id}`
  const otpauth = authenticator.keyuri(label, service, secret)

  await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorSecret: secret } })

  return NextResponse.json({ secret, otpauth })
}

