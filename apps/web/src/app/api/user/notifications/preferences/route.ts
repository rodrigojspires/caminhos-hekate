import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const pref = await prisma.notificationPreference.findUnique({ where: { userId: session.user.id } })
    return NextResponse.json({
      email: pref?.email ?? true,
      whatsapp: pref?.whatsapp ?? false,
      whatsappNumber: pref?.whatsappNumber ?? '',
      quietHoursEnabled: pref?.quietHoursEnabled ?? false,
      quietHoursStart: pref?.quietHoursStart ?? '22:00',
      quietHoursEnd: pref?.quietHoursEnd ?? '08:00',
    })
  } catch (e) {
    console.error('GET /api/user/notifications/preferences error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const data = {
      email: !!body.email,
      whatsapp: !!body.whatsapp,
      whatsappNumber: typeof body.whatsappNumber === 'string' ? body.whatsappNumber : null,
      quietHoursEnabled: !!body.quietHoursEnabled,
      quietHoursStart: typeof body.quietHoursStart === 'string' ? body.quietHoursStart : null,
      quietHoursEnd: typeof body.quietHoursEnd === 'string' ? body.quietHoursEnd : null,
    }

    await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PUT /api/user/notifications/preferences error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

