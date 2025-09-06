import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/courses/recommended?limit=6
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 24)

    // Heurística simples: cursos mais populares por inscrições
    const popular = await prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: { courseId: true },
      orderBy: { _count: { courseId: 'desc' } },
      take: limit * 2
    })
    const courseIds = popular.map(p => p.courseId)

    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds }, status: 'PUBLISHED' as any },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        duration: true,
        price: true,
      }
    })

    const payload = {
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description || '',
        instructor: { name: 'Instrutor', rating: 4.8 },
        duration: c.duration ? `${c.duration}h` : '—',
        students: popular.find(p => p.courseId === c.id)?._count.courseId || 0,
        rating: 4.8,
        price: c.price != null ? `R$ ${Number(c.price).toFixed(2)}` : 'R$ 0,00',
        level: (c as any).level || 'BEGINNER',
        category: 'Geral',
        tags: [],
        isNew: false,
        isTrending: true,
        matchPercentage: 92
      })),
      total: courses.length
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao obter cursos recomendados:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
