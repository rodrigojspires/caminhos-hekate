import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@hekate/database'
import crypto from 'crypto'

// Compute storage roots
const PUBLIC_ROOT = (() => {
  const candidates = [
    join(process.cwd(), 'apps', 'web', 'public'),
    join(process.cwd(), 'public'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return join(process.cwd(), 'public')
})()

const PRIVATE_ROOT = (() => {
  const candidates = [
    join(process.cwd(), 'apps', 'web', 'private_uploads'),
    join(process.cwd(), 'private_uploads'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return join(process.cwd(), 'apps', 'web', 'private_uploads')
})()

function normalizeVideoPath(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // Accept either /uploads/course-videos/filename or /private/course-videos/filename or course-videos/filename
  const cleaned = trimmed.replace(/^https?:\/\/[^/]+\//, '/').replace(/^\/+/, '/')
  const withoutPrefix = cleaned
    .replace(/^\/uploads\//, '')
    .replace(/^\/private\//, '')
  if (!withoutPrefix.startsWith('course-videos/')) return null
  const safe = withoutPrefix.replace(/\.\.+/g, '').replace(/[^a-zA-Z0-9_\-./]/g, '')
  return safe
}

function getExistingAbsolutePath(rel: string): string | null {
  const privateCandidate = join(PRIVATE_ROOT, 'uploads', rel)
  if (existsSync(privateCandidate)) return privateCandidate
  const publicCandidate = join(PUBLIC_ROOT, 'uploads', rel)
  if (existsSync(publicCandidate)) return publicCandidate
  return null
}

function hmacSign(payload: any): string {
  const secret = process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET || 'change-me-in-prod'
  const json = JSON.stringify(payload)
  const data = Buffer.from(json).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex')
  return `${data}.${sig}`
}

function hmacVerify(token: string): any | null {
  try {
    const secret = process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET || 'change-me-in-prod'
    const [data, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!payload?.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rawPath = searchParams.get('path') || ''
    const courseId = searchParams.get('courseId') || undefined

    const rel = normalizeVideoPath(rawPath)
    if (!rel) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
    }

    const abs = getExistingAbsolutePath(rel)
    if (!abs) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Basic authorization: admin OR enrolled in course
    let authorized = session.user.role === 'ADMIN'
    if (!authorized && courseId) {
      try {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: session.user.id, courseId } },
          select: { id: true }
        })
        authorized = !!enrollment
      } catch {
        authorized = false
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const ttlSec = Number(process.env.MEDIA_TOKEN_TTL_SEC || 600) // default 10 minutes
    const payload = {
      path: rel,
      userId: session.user.id,
      courseId,
      iat: Date.now(),
      exp: Date.now() + ttlSec * 1000,
    }
    const token = hmacSign(payload)
    const url = `/api/media/course-videos/stream?token=${encodeURIComponent(token)}`

    return NextResponse.json({ token, url, expiresIn: ttlSec })
  } catch (e) {
    console.error('Token issue error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'