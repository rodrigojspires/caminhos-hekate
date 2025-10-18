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
    default:
      return 'application/octet-stream'
  }
}

export async function GET(_req: NextRequest, ctx: { params: { path: string[] } }) {
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
    const stream = createReadStream(filepath)
    const ctype = contentTypeFromExt(segments[segments.length - 1])
    const headers: Record<string, string> = {
      'Content-Type': ctype,
      'Content-Length': String(stats.size),
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Access-Control-Allow-Origin': '*',
    }
    // Usar Response nativa para streaming mais robusto
    return new Response(stream as any, { status: 200, headers })
  } catch (e) {
    console.error('Erro ao servir upload público:', e)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0