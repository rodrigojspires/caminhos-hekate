import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      session: null,
    }
  }

  if (session.user.role !== 'ADMIN') {
    return {
      error: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }),
      session: null,
    }
  }

  return { error: null, session }
}
