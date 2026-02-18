import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { applyRateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const candidates = trimmed.includes('://') ? [trimmed] : [trimmed, `https://${trimmed}`]

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate)
      if (parsed.hostname === '0.0.0.0') continue
      return parsed.origin
    } catch {
      continue
    }
  }

  return null
}

function resolveBaseUrl(request: NextRequest) {
  const byEnv =
    normalizeOrigin(process.env.NEXT_PUBLIC_MAHALILAH_URL) ||
    normalizeOrigin(process.env.NEXTAUTH_URL_MAHALILAH) ||
    normalizeOrigin(process.env.NEXTAUTH_URL)

  if (byEnv) return byEnv

  const requestOrigin = normalizeOrigin(request.nextUrl.origin)
  if (requestOrigin) return requestOrigin

  return 'https://mahalilahonline.com.br'
}

function loginRedirect(request: NextRequest, status: 'success' | 'invalid' | 'expired') {
  const url = new URL('/login', resolveBaseUrl(request))
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
