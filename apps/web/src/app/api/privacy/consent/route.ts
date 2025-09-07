import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const consentType = typeof body.consentType === 'string' ? body.consentType : 'cookies'
    const consent = body.consent || {}

    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const ua = req.headers.get('user-agent') || ''

    await prisma.userConsent.create({
      data: {
        userId: session?.user?.id || null,
        consentType,
        consent,
        ipAddress: ip,
        userAgent: ua,
      },
    })

    const res = NextResponse.json({ success: true })
    res.cookies.set('cookie_consent', encodeURIComponent(JSON.stringify(consent)), {
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    })
    return res
  } catch (e) {
    console.error('POST /api/privacy/consent error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
