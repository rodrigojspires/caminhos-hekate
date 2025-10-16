import { Metadata } from 'next'
import { prisma, CourseStatus, CourseLevel } from '@hekate/database'
import { CoursesHero } from '@/components/public/courses/CoursesHero'
import { CourseStats, type CourseStatItem } from '@/components/public/courses/CourseStats'
import { CoursesExplorer, type PublicCourse } from '@/components/public/courses/CoursesExplorer'
import { CTA } from '@/components/public/CTA'

export const metadata: Metadata = {
  title: 'Cursos | Caminhos de Hekate',
  description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal, autoconhecimento e espiritualidade. Transforme sua vida com conteúdo de qualidade.',
  keywords: [
    'cursos online',
    'desenvolvimento pessoal',
    'autoconhecimento',
    'espiritualidade',
    'transformação pessoal',
    'crescimento interior',
    'meditação',
    'mindfulness',
    'coaching',
    'terapia'
  ],
  openGraph: {
    title: 'Cursos | Caminhos de Hekate',
    description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal e espiritualidade.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cursos | Caminhos de Hekate',
    description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal e espiritualidade.',
  },
  alternates: {
    canonical: '/cursos'
  }
}

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof prisma.course.findMany>> = []

  try {
    courses = await prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      include: {
        modules: {
          include: {
            lessons: {
              select: { id: true }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.warn('[Cursos] Falha ao carregar cursos publicados durante o build.', error)
  }

  const publicCourses: PublicCourse[] = courses.map((course) => {
    const tags = Array.isArray(course.tags)
      ? (course.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
      : []

    const lessonsCount = course.modules.reduce((total, module) => total + module.lessons.length, 0)

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription,
      level: course.level ?? CourseLevel.BEGINNER,
      duration: course.duration,
      price: course.price != null ? Number(course.price) : null,
      comparePrice: (course as any).comparePrice != null ? Number((course as any).comparePrice) : null,
      featuredImage: course.featuredImage,
      introVideo: course.introVideo,
      modules: course.modules.length,
      lessons: lessonsCount,
      students: course._count.enrollments,
      tags,
    }
  })

  const categories = publicCourses.length
    ? Array.from(new Set(publicCourses.flatMap((course) => course.tags))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    : []

  const levels = publicCourses.length
    ? Array.from(new Set(publicCourses.map((course) => course.level ?? CourseLevel.BEGINNER)))
    : [CourseLevel.BEGINNER]

  const totalLessons = publicCourses.reduce((total, course) => total + course.lessons, 0)
  const totalHours = publicCourses.reduce((total, course) => total + (course.duration ?? 0), 0)
  const totalStudents = publicCourses.reduce((total, course) => total + course.students, 0)

  const primaryStatsAvailable = publicCourses.length > 0

  const stats: CourseStatItem[] = [
    {
      icon: 'book',
      value: `${publicCourses.length}`,
      label: 'Cursos Disponíveis',
      description: primaryStatsAvailable ? 'Conteúdo atualizado e publicado' : 'Nenhum curso publicado no momento',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: 'users',
      value: totalStudents.toLocaleString('pt-BR'),
      label: 'Alunos Inscritos',
      description: primaryStatsAvailable ? 'Comunidade ativa aprendendo com a Hekate' : 'Seja o primeiro a se inscrever',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: 'clock',
      value: `${totalHours}h`,
      label: 'Horas de conteúdo',
      description: primaryStatsAvailable ? 'Duração total somada dos cursos publicados' : 'Conteúdo será divulgado em breve',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: 'video',
      value: `${totalLessons}`,
      label: 'Aulas disponíveis',
      description: 'Aulas organizadas em módulos com materiais exclusivos',
      color: 'from-amber-500 to-orange-500'
    }
  ]

  return (
    <main className="min-h-screen">
      <CoursesHero />
      <CourseStats stats={stats} />
      <CoursesExplorer courses={publicCourses} categories={categories} levels={levels} />
      <CTA />
    </main>
  )
}
