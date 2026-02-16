import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { applyRateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

function loginRedirect(request: NextRequest, status: 'success' | 'invalid' | 'expired') {
  const url = new URL('/login', request.url)
  url.searchParams.set('verified', status)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit({
      request,
      scope: 'auth:verify-email',
      limit: 20,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return loginRedirect(request, 'invalid')
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!verificationToken) {
      return loginRedirect(request, 'invalid')
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined)
      return loginRedirect(request, 'expired')
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: verificationToken.identifier, emailVerified: null },
        data: { emailVerified: new Date() }
      }),
      prisma.verificationToken.delete({ where: { token } })
    ])

    return loginRedirect(request, 'success')
  } catch (error) {
    console.error('Erro ao verificar e-mail (Maha Lilah):', error)
    return loginRedirect(request, 'invalid')
  }
}
