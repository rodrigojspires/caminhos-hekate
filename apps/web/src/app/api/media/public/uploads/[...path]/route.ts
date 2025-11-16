import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { existsSync, createReadStream } from 'fs'
import { stat as fsStat } from 'fs/promises'

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

function sanitizeSegment(seg: string): string {
  return seg.replace(/[^a-zA-Z0-9._-]/g, '')
}

function contentTypeFromExt(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
    case 'ogv':
      return 'video/ogg'
    case 'mov':
    case 'qt':
      return 'video/quicktime'
    case 'm3u8':
      return 'application/vnd.apple.mpegurl'
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'aac':
      return 'audio/aac'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  try {
    const raw = Array.isArray(ctx.params?.path) ? ctx.params.path : []
    const segments = raw.map(sanitizeSegment).filter(Boolean)
    // Espera ao menos [category, filename]
    if (segments.length < 2) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    // Tentar primeiro no diretório público
    const publicPath = join(PUBLIC_ROOT, 'uploads', ...segments)
    let filepath = ''
    if (existsSync(publicPath)) {
      filepath = publicPath
    } else {
      // Fallback: diretório privado
      const privatePath = join(PRIVATE_ROOT, 'uploads', ...segments)
      if (existsSync(privatePath)) {
        filepath = privatePath
      } else {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
      }
    }

    const stats = await fsStat(filepath)
    const rangeHeader = req.headers.get('range')
    const ctype = contentTypeFromExt(segments[segments.length - 1])
    const baseHeaders: Record<string, string> = {
      'Content-Type': ctype,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    }

    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
      let start = 0
      let end = stats.size - 1
      if (match) {
        if (match[1]) start = Number(match[1])
        if (match[2]) end = Number(match[2])
      }
      if (Number.isNaN(start) || start < 0) start = 0
      if (Number.isNaN(end) || end >= stats.size) end = stats.size - 1
      const chunkSize = end - start + 1
      const stream = createReadStream(filepath, { start, end })
      const headers = {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Content-Length': String(chunkSize),
      }
      return new Response(stream as any, { status: 206, headers })
    }

    const stream = createReadStream(filepath)
    const headers = {
      ...baseHeaders,
      'Content-Length': String(stats.size),
    }
    return new Response(stream as any, { status: 200, headers })
  } catch (e) {
    console.error('Erro ao servir upload público:', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
