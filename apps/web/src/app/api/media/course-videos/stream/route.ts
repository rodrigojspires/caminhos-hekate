import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { existsSync, createReadStream } from 'fs'
import { stat as fsStat } from 'fs/promises'
import crypto from 'crypto'

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
  const envDir = process.env.PRIVATE_UPLOAD_ROOT
  const candidates = [
    envDir,
    '/app/uploads',
    join(process.cwd(), 'apps', 'web', 'private_uploads'),
    join(process.cwd(), 'private_uploads'),
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return join(process.cwd(), 'apps', 'web', 'private_uploads')
})()

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

function contentTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'mp4': return 'video/mp4'
    case 'webm': return 'video/webm'
    case 'ogg':
    case 'ogv': return 'video/ogg'
    case 'mov':
    case 'qt': return 'video/quicktime'
    case 'm3u8': return 'application/vnd.apple.mpegurl'
    default: return 'application/octet-stream'
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') || ''
    const payload = hmacVerify(token)
    if (!payload?.path) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 403 })
    }

    // sanitize relative path
    const rel = String(payload.path)
      .replace(/\.\.+/g, '')
      .replace(/[^a-zA-Z0-9_\-./]/g, '')

    // locate file
    let abs = join(PRIVATE_ROOT, 'uploads', rel)
    if (!existsSync(abs)) {
      const fallback = join(PUBLIC_ROOT, 'uploads', rel)
      if (existsSync(fallback)) abs = fallback
    }
    if (!existsSync(abs)) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const stat = await fsStat(abs)
    const range = req.headers.get('range')
    const ext = abs.split('.').pop() || ''
    const mime = contentTypeFromExt(ext)

    // Default headers
    const baseHeaders: Record<string, string> = {
      'Content-Type': mime,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': 'inline',
    }

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range)
      let start = 0
      let end = stat.size - 1
      if (match) {
        if (match[1]) start = parseInt(match[1], 10)
        if (match[2]) end = parseInt(match[2], 10)
      }
      if (isNaN(start) || start < 0) start = 0
      if (isNaN(end) || end >= stat.size) end = stat.size - 1
      const chunkSize = end - start + 1
      const stream = createReadStream(abs, { start, end })
      const headers = {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': String(chunkSize),
      }
      return new NextResponse(stream as any, { status: 206, headers })
    }

    const headers = {
      ...baseHeaders,
      'Content-Length': String(stat.size),
    }
    const stream = createReadStream(abs)
    return new NextResponse(stream as any, { status: 200, headers })
  } catch (e) {
    console.error('Stream error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'