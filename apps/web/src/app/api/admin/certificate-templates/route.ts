import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { withAdminAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  text: z.string().optional(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  maxWidth: z.number().optional()
})

const layoutSchema = z.object({
  fields: z.array(fieldSchema).optional(),
  footerText: z.string().optional()
}).optional()

const templateSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  description: z.string().optional(),
  courseId: z.string().nullable().optional(),
  backgroundImageUrl: z.string().url().optional(),
  layout: layoutSchema,
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
}).transform((data) => ({
  ...data,
  courseId: data.courseId || null,
  isDefault: data.isDefault ?? false,
  isActive: data.isActive ?? true,
}))

// GET /api/admin/certificate-templates - listar templates
export const GET = withAdminAuth(async (_user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const active = searchParams.get('active')

    const templates = await prisma.certificateTemplate.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(active ? { isActive: active === 'true' } : {})
      },
      include: {
        course: {
          select: { id: true, title: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { certificates: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erro ao listar templates de certificado', error)
    return NextResponse.json({ error: 'Erro ao listar templates' }, { status: 500 })
  }
})

// POST /api/admin/certificate-templates - criar template
export const POST = withAdminAuth(async (user, request: NextRequest) => {
  try {
    const body = await request.json()
    const data = templateSchema.parse(body)

    if (data.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: { courseId: data.courseId },
        data: { isDefault: false }
      })
    }

    const template = await prisma.certificateTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        courseId: data.courseId,
        backgroundImageUrl: data.backgroundImageUrl,
        layout: data.layout || {},
        isDefault: data.isDefault,
        isActive: data.isActive,
        createdById: user.id,
        updatedById: user.id
      },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { certificates: true } }
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template de certificado', error)
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.message : 'Erro ao criar template' },
      { status: 400 }
    )
  }
})
