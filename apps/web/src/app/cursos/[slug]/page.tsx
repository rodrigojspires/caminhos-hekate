import { Metadata } from 'next'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CourseDetail from '@/components/public/courses/CourseDetail'
import CoursePresentation from '@/components/public/courses/CoursePresentation'

type PageProps = {
  params: { slug: string }
  searchParams?: { view?: string }
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

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

export default async function CoursePage({ params, searchParams }: PageProps) {
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
        include: {
          lessons: {
            include: {
              assets: {
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
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

  const accessModels = Array.isArray(course.accessModels) ? course.accessModels : []
  const courseTierValue = tierOrder[course.tier as keyof typeof tierOrder] ?? 0
  const userTierValue = isAdmin ? Number.POSITIVE_INFINITY : tierOrder[userTier as keyof typeof tierOrder] ?? 0
  const canAccessBySubscription = accessModels.includes('SUBSCRIPTION') && userTierValue >= courseTierValue
  const canAccessAllContent = isAdmin ? true : canAccessBySubscription

  const enrollment = isAdmin
    ? { status: 'active' }
    : session?.user?.id
      ? await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
          select: { status: true, createdAt: true }
        })
      : null

  const enrollmentStatus = isAdmin ? 'active' : enrollment?.status ?? null
  const isEnrolled = enrollmentStatus != null

  const viewParam = searchParams?.view
  const forcedOverview = viewParam === 'overview'
  const forcedContent = viewParam === 'content'
  const shouldShowContent = !forcedOverview && (forcedContent || (isEnrolled && enrollmentStatus === 'active'))

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
      {shouldShowContent ? (
        <CourseDetail
          course={course as any}
          canAccessAllContent={canAccessAllContent}
          initialEnrolled={enrollmentStatus === 'active'}
          enrollmentStartedAt={enrollment?.createdAt ? enrollment.createdAt.toISOString() : null}
        />
      ) : (
        <>
          <div className="mb-4">
            <a href="/cursos" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
              ← Voltar para todos os cursos
            </a>
          </div>
          <CoursePresentation
            course={course as any}
            userTier={userTier}
            canAccessBySubscription={canAccessBySubscription}
            isAdmin={isAdmin}
            initialEnrolled={enrollmentStatus === 'active'}
            initialEnrollmentStatus={enrollmentStatus}
            continueUrl={`/cursos/${course.slug}?view=content`}
            isAuthenticated={!!session?.user}
          />
        </>
      )}
    </main>
  )
}
