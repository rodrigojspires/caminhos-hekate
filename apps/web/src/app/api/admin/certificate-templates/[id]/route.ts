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

const backgroundUrlSchema = z.string().trim().optional().refine((value) => {
  if (!value) return true
  if (value.startsWith('/uploads/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}, { message: 'Invalid url' })

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  courseId: z.string().nullable().optional(),
  backgroundImageUrl: backgroundUrlSchema,
  layout: layoutSchema,
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
})

// PUT /api/admin/certificate-templates/:id - atualizar template
export const PUT = withAdminAuth(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json()
    const data = updateSchema.parse(body)
    const templateId = params.id

    const existingTemplate = await prisma.certificateTemplate.findUnique({
      where: { id: templateId },
      select: { courseId: true }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    const updateData: any = {
      updatedById: user.id
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.courseId !== undefined) updateData.courseId = data.courseId || null
    if (data.backgroundImageUrl !== undefined) updateData.backgroundImageUrl = data.backgroundImageUrl
    if (data.layout !== undefined) updateData.layout = data.layout
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const targetCourseId = data.courseId !== undefined ? data.courseId || null : existingTemplate.courseId

    if (data.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: {
          courseId: targetCourseId,
          NOT: { id: templateId }
        },
        data: { isDefault: false }
      })
    }

    const template = await prisma.certificateTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { certificates: true } }
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erro ao atualizar template de certificado', error)
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.message : 'Erro ao atualizar template' },
      { status: 400 }
    )
  }
})

// DELETE /api/admin/certificate-templates/:id - remover template
export const DELETE = withAdminAuth(async (_user, _request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    await prisma.certificateTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover template de certificado', error)
    return NextResponse.json({ error: 'Erro ao remover template' }, { status: 400 })
  }
})
