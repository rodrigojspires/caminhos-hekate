import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/user/certificates - Lista certificados do usuário autenticado
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    const certs = await prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            featuredImage: true,
            duration: true,
          },
        },
      },
    })

    // Montar payload esperado pelo CertificateGallery
    const results = await Promise.all(
      certs.map(async (c) => {
        // Média de score em quizzes do curso (se existir)
        let avgScore = 0
        try {
          const scoreAgg = await prisma.quizAttempt.aggregate({
            where: {
              userId,
              quiz: {
                lesson: { module: { courseId: c.courseId } },
              },
            },
            _avg: { score: true },
          })
          if (scoreAgg._avg.score != null) {
            avgScore = Math.round(Number(scoreAgg._avg.score))
          }
        } catch {
          // Mantém default 0 se não houver quizzes/modelo
        }

        return {
          id: c.id,
          title: c.course?.title || 'Certificado',
          courseName: c.course?.title || 'Curso',
          completedAt: c.issuedAt?.toISOString?.() || new Date().toISOString(),
          score: avgScore,
          certificateUrl: `/api/certificates/${c.courseId}`,
          thumbnailUrl: c.course?.featuredImage || '',
          instructor: 'Equipe de Ensino',
          duration: c.course?.duration != null ? `${c.course?.duration} min` : '—',
        }
      })
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('GET /api/user/certificates error', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}