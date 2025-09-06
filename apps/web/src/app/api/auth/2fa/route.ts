import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/2fa - status 2FA
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabled: true } })
  return NextResponse.json({ enabled: !!user?.twoFactorEnabled })
}

