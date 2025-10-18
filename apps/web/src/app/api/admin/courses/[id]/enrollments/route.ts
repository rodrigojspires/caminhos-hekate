import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { resendEmailService } from '@/lib/resend-email'
import { GamificationEngine } from '@/lib/gamification-engine'
import notificationService from '@/lib/notifications/notification-service'

const PAID_COURSE_ENROLL_POINTS = 80
const FREE_COURSE_ENROLL_POINTS = 10

interface RouteParams {
  params: {
    id: string
  }
}

const ManualEnrollSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional()
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: params.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enrollment.count({ where: { courseId: params.id } })
    ])

    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('GET /api/admin/courses/[id]/enrollments error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const body = await request.json()
    const { email, name } = ManualEnrollSchema.parse(body)

    // Verificar curso
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, slug: true, price: true, duration: true, tier: true }
    })
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    // Normalizar URL base
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
    const normalizedBase = baseUrl ? baseUrl.replace(/\/$/, '') : ''
    const courseUrl = normalizedBase ? `${normalizedBase}/cursos/${course.slug}` : `/cursos/${course.slug}`

    // Buscar usuário por email
    let user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    let emailsSent = 0
    let createdUser = false

    if (!user) {
      // Criar usuário com senha temporária e marcar email verificado
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4)
      const hashedPassword = await bcrypt.hash(tempPassword, 12)
  
      user = await prisma.user.create({
        data: {
          name: name || null,
          email,
          password: hashedPassword,
          emailVerified: new Date()
        },
        select: { id: true, name: true, email: true }
      })
      createdUser = true
  
      // Enviar email com acesso temporário
      try {
        await resendEmailService.sendEmail({
          to: email,
          subject: 'Acesso à plataforma • Credenciais temporárias',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Sua conta foi criada</h2>
              <p style="color: #555;">Olá${name ? ` ${name}` : ''}, criamos uma conta para você na plataforma Caminhos de Hekate.</p>
              <p style="color: #555;">Use as credenciais abaixo para acessar e depois altere sua senha nas configurações.</p>
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 4px 0;"><strong>Senha temporária:</strong> ${tempPassword}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${normalizedBase ? `${normalizedBase}/auth/login` : '/auth/login'}" style="background: #7c3aed; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar minha conta</a>
              </div>
              <p style="color: #777; font-size: 12px;">Se você não solicitou esta conta, ignore este email.</p>
            </div>
          `,
          text: `Sua conta foi criada. Email: ${email} | Senha temporária: ${tempPassword}`,
          priority: 'NORMAL'
        })
        emailsSent += 1
      } catch (e) {
        console.error('Erro ao enviar email de credenciais temporárias:', e)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Não foi possível criar ou localizar o usuário' }, { status: 500 })
    }

    // Upsert inscrição como ativa
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      create: { userId: user.id, courseId: course.id, status: 'active' },
      update: { status: 'active' }
    })

    // Enviar email de confirmação de inscrição
    try {
      const priceLabel = course.price != null ? `R$ ${(Number(course.price)).toFixed(2)}` : '—'
      const durationLabel = course.duration ? `${course.duration}h` : ''
      await resendEmailService.sendEmail({
        to: user.email,
        subject: `Inscrição confirmada: ${course.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #333;">Inscrição Confirmada 🎉</h1>
              <p style="color: #555;">${user.name ? `Parabéns ${user.name},` : 'Parabéns,'} você foi inscrito(a) no curso:</p>
              <h2 style="color: #7c3aed; margin: 12px 0;">${course.title}</h2>
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #555; margin: 4px 0;"><strong>Preço:</strong> ${priceLabel}</p>
              ${durationLabel ? `<p style="color: #555; margin: 4px 0;"><strong>Duração:</strong> ${durationLabel}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${courseUrl}" style="background: #7c3aed; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar Curso</a>
            </div>
            <p style="color: #777; font-size: 12px; text-align: center;">Caminhos de Hekate</p>
          </div>
        `,
        text: `Inscrição confirmada em ${course.title}. Acesse: ${courseUrl}`,
        priority: 'NORMAL'
      })
      emailsSent += 1
    } catch (e) {
      console.error('Erro ao enviar email de inscrição:', e)
    }

    // Gamification: conceder pontos e criar notificação
    try {
      const isPaidCourse = course.price != null && Number(course.price) > 0
      const pointsToAward = isPaidCourse ? PAID_COURSE_ENROLL_POINTS : FREE_COURSE_ENROLL_POINTS

      // Evitar duplicidade: checar transação com courseId
      const existingTx = await prisma.pointTransaction.findFirst({
        where: {
          userId: user.id,
          metadata: {
            path: ['courseId'],
            equals: course.id
          }
        }
      })

      if (!existingTx && pointsToAward > 0) {
        const uniqueKey = `course_enrolled_${user.id}_${course.id}`
        const reasonLabel = isPaidCourse ? 'Inscrição em curso pago' : 'Inscrição em curso gratuito'

        await GamificationEngine.awardPoints(user.id, pointsToAward, 'COURSE_ENROLLED', {
          eventType: 'COURSE_ENROLLED',
          reasonLabel,
          courseId: course.id,
          courseTitle: course.title,
          price: course.price ?? 0,
          paid: isPaidCourse,
          uniqueKey
        })

        const userPoints = await prisma.userPoints.findUnique({
          where: { userId: user.id },
          select: { totalPoints: true }
        })

        await notificationService.createNotification({
          userId: user.id,
          type: 'SPECIAL_EVENT',
          title: 'Pontos ganhos na inscrição',
          message: `Você ganhou ${pointsToAward} pontos ao se inscrever em ${course.title}.`,
          data: {
            points: pointsToAward,
            reason: reasonLabel,
            totalPoints: userPoints?.totalPoints ?? undefined,
            courseId: course.id,
            courseTitle: course.title,
            paid: isPaidCourse
          },
          priority: isPaidCourse ? 'MEDIUM' : 'LOW'
        })
      }
    } catch (e) {
      console.error('Gamification enrollment points/notification error:', e)
    }

    return NextResponse.json({
      success: true,
      createdUser,
      emailsSent,
      enrollmentStatus: 'active'
    })
  } catch (error) {
    console.error('POST /api/admin/courses/[id]/enrollments error', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
