import { NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, color: true }
    })
    return NextResponse.json({ topics })
  } catch (error) {
    console.error('Erro ao listar tópicos:', error)
    return NextResponse.json({ topics: [] })
  }
}

