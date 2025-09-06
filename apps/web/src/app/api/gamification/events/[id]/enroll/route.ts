import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// POST /api/gamification/events/[id]/enroll - Minimal enrollment (no-op placeholder)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json({ success: true, eventId: params.id, enrolled: true })
}

