import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// POST /api/auth/2fa/disable
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await prisma.user.update({ where: { id: session.user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] } })
  return NextResponse.json({ success: true })
}

