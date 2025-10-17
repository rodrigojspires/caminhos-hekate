import { Metadata } from 'next'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CourseDetail from '@/components/public/courses/CourseDetail'

type PageProps = {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    select: { title: true, shortDescription: true }
  })

  return {
    title: course ? `${course.title} | Cursos | Caminhos de Hekate` : 'Curso | Caminhos de Hekate',
    description: course?.shortDescription || 'Detalhes do curso'
  }
}

export default async function CoursePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { subscriptionTier: true } })
    : null
  const userTier = dbUser?.subscriptionTier || 'FREE'
  const isAdmin = session?.user?.role === 'ADMIN'

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      modules: {
        include: { lessons: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!course) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Curso não encontrado</h1>
        <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
      </div>
    )
  }

  // Simple tier ordering for gating
  const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }
  const canAccessAllContent = isAdmin ? true : (order[userTier] || 0) >= (order[course.tier] || 0)
  
  // Initial enrollment state for SSR hydration
  const isEnrolled = isAdmin
    ? true
    : session?.user?.id
      ? !!(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: course.id } } }))
      : false

  return (
    <main className="min-h-screen container mx-auto py-8">
      {/* JSON-LD Course */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org/',
          '@type': 'Course',
          name: course.title,
          description: course.shortDescription || course.description,
          provider: {
            '@type': 'Organization',
            name: 'Caminhos de Hekate',
            sameAs: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL,
          },
        }) }}
      />
      <CourseDetail course={course as any} canAccessAllContent={canAccessAllContent} initialEnrolled={isEnrolled} />
    </main>
  )
}
