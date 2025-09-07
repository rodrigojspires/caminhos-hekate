import { NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET() {
  try {
    const rows = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      distinct: ['authorId'],
      select: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' }
    })
    const authors = rows.map(r => r.author).filter(Boolean)
    return NextResponse.json({ authors })
  } catch (error) {
    console.error('Erro ao listar autores:', error)
    return NextResponse.json({ authors: [] })
  }
}

