import { Metadata } from 'next'
import { prisma, CourseStatus, CourseLevel, Prisma } from '@hekate/database'
import { CoursesMarketplace } from '@/components/public/courses/CoursesMarketplace'
import type { PublicCourse } from '@/components/public/courses/CoursesExplorer'

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

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CourseWithRelations = Prisma.CourseGetPayload<{
  include: {
    modules: {
      include: {
        lessons: {
          select: { id: true }
        }
      }
    }
    _count: {
      select: {
        enrollments: true
      }
    }
    category: {
      select: {
        id: true,
        name: true,
        slug: true
      }
    }
  }
}>

export default async function CoursesPage() {
  let courses: CourseWithRelations[] = []

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
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
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
      comparePrice: course.comparePrice != null ? Number(course.comparePrice) : null,
      featuredImage: course.featuredImage,
      introVideo: course.introVideo,
      featured: course.featured,
      modules: course.modules.length,
      lessons: lessonsCount,
      students: course._count.enrollments,
      tags,
      categoryId: course.category?.id ?? null,
      categoryName: course.category?.name ?? null,
      categorySlug: course.category?.slug ?? null,
    }
  })

  return (
    <main className="min-h-screen">
      <CoursesMarketplace courses={publicCourses} />
    </main>
  )
}
