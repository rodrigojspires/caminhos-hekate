import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/2fa/backup-codes
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorBackupCodes: true } })
  const codes = (user?.twoFactorBackupCodes as any) || []
  return NextResponse.json({ totalCodes: codes.length, remainingCodes: codes.length, usedCodes: 0, backupCodes: codes })
}

