import { NextResponse } from 'next/server'

export async function GET() {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const lines = [
    `User-agent: *`,
    `Allow: /`,
    `Sitemap: ${base}/sitemap.xml`,
  ]
  return new NextResponse(lines.join('\n'), { status: 200, headers: { 'Content-Type': 'text/plain' } })
}
