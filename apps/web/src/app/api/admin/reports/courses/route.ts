import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    const start = startParam ? new Date(startParam) : new Date(new Date().getFullYear(), 0, 1)
    const end = endParam ? new Date(endParam) : new Date()

    const enrolls = await prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { courseId: true },
    })

    const courses = await prisma.course.findMany({ where: { id: { in: enrolls.map(e => e.courseId) } }, select: { id: true, title: true } })
    const mapTitle = new Map(courses.map(c => [c.id, c.title]))
    const top = enrolls.sort((a,b) => (b._count.courseId - a._count.courseId)).slice(0, 10).map(e => ({ id: e.courseId, title: mapTitle.get(e.courseId), enrollments: e._count.courseId }))

    const totalEnrollments = enrolls.reduce((acc, e) => acc + e._count.courseId, 0)

    return NextResponse.json({ range: { start, end }, totals: { totalEnrollments }, top })
  } catch (e) {
    console.error('GET /api/admin/reports/courses error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
