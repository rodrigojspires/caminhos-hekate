import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET: retorna o quiz da lição (sem respostas corretas explicitamente, quando possível)
export async function GET(_req: NextRequest, { params }: { params: { courseId: string, lessonId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = session.user.id

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId, module: { courseId: params.courseId } },
      select: { id: true, isFree: true, module: { select: { course: { select: { tier: true } } } } }
    })
    if (!lesson) return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 })

    // Tier check
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }
    const requiredTier = lesson.module.course.tier as keyof typeof order
    const allowedByTier = order[(user?.subscriptionTier as keyof typeof order) || 'FREE'] >= order[requiredTier]
    if (!allowedByTier) return NextResponse.json({ error: 'Nível de assinatura insuficiente' }, { status: 403 })

    // Enrollment check for non-free
    if (!lesson.isFree) {
      const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: params.courseId } } })
      if (!enrollment) return NextResponse.json({ error: 'Inscrição necessária' }, { status: 403 })
    }

    const quiz = await prisma.quiz.findFirst({ where: { lessonId: params.lessonId } })
    if (!quiz) return NextResponse.json({ quiz: null })

    // Try to strip answers if structured
    let questions = quiz.questions as any
    if (Array.isArray(questions)) {
      questions = questions.map((q) => {
        const { correctIndex, correct, ...rest } = q
        return rest
      })
    }

    return NextResponse.json({ quiz: { id: quiz.id, title: quiz.title, passingScore: quiz.passingScore, questions } })
  } catch (error) {
    console.error('Erro ao buscar quiz:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST: submete tentativa do quiz
export async function POST(req: NextRequest, { params }: { params: { courseId: string, lessonId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const answers = await req.json().catch(() => ({}))

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId, module: { courseId: params.courseId } },
      select: { id: true, isFree: true, module: { select: { course: { select: { tier: true } } } } }
    })
    if (!lesson) return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 })

    // Gates
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }
    const requiredTier = lesson.module.course.tier as keyof typeof order
    const allowedByTier = order[(user?.subscriptionTier as keyof typeof order) || 'FREE'] >= order[requiredTier]
    if (!allowedByTier) return NextResponse.json({ error: 'Nível de assinatura insuficiente' }, { status: 403 })
    if (!lesson.isFree) {
      const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: params.courseId } } })
      if (!enrollment) return NextResponse.json({ error: 'Inscrição necessária' }, { status: 403 })
    }

    const quiz = await prisma.quiz.findFirst({ where: { lessonId: params.lessonId } })
    if (!quiz) return NextResponse.json({ error: 'Quiz não encontrado' }, { status: 404 })

    const questions = quiz.questions as any[]
    let correct = 0
    let total = 0
    if (Array.isArray(questions)) {
      for (const q of questions) {
        total += 1
        const answer = answers?.[q.id]
        // Accept either index or exact option match
        const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : undefined
        const correctValue = q.options?.[correctIndex as number]
        if (typeof answer === 'number' && correctIndex !== undefined && answer === correctIndex) correct += 1
        else if (answer != null && correctValue != null && answer === correctValue) correct += 1
      }
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed = score >= (quiz.passingScore || 70)

    await prisma.quizAttempt.create({
      data: { quizId: quiz.id, userId, answers, score, passed }
    })

    // Se aprovado, marcar progresso da lição como concluído
    if (passed) {
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId, lessonId: params.lessonId } },
        create: { userId, lessonId: params.lessonId, completed: true, completedAt: new Date() },
        update: { completed: true, completedAt: new Date() }
      })

      // Verificar se é a última lição do curso e concluir curso/emitir certificado
      const modules = await prisma.module.findMany({
        where: { courseId: params.courseId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' }
      })
      const moduleIds = modules.map((m) => m.id)
      const lastModule = modules[modules.length - 1]
      const lastLesson = lastModule
        ? await prisma.lesson.findFirst({ where: { moduleId: lastModule.id }, orderBy: { order: 'desc' } })
        : null

      const totalLessons = moduleIds.length
        ? await prisma.lesson.count({ where: { moduleId: { in: moduleIds } } })
        : 0
      const completedLessons = await prisma.progress.count({ where: { userId, completed: true, lesson: { module: { courseId: params.courseId } } } })

      if (lastLesson && lastLesson.id === params.lessonId && totalLessons > 0 && completedLessons >= totalLessons) {
        // Concluir inscrição (se existir)
        const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: params.courseId } } })
        if (enrollment && !enrollment.completedAt) {
          await prisma.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } })
        }

        // Emitir certificado se ainda não existir
        await prisma.certificate.upsert({
          where: { userId_courseId: { userId, courseId: params.courseId } },
          create: {
            userId,
            courseId: params.courseId,
            certificateNumber: `HEK-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
          },
          update: {}
        })
      }
    }

    return NextResponse.json({ score, passed, correct, total })
  } catch (error) {
    console.error('Erro ao submeter tentativa de quiz:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
