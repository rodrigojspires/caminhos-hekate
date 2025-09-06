import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para atualização de template
const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  category: z.enum(['TRANSACTIONAL', 'MARKETING', 'NOTIFICATION', 'SYSTEM', 'WELCOME', 'CONFIRMATION', 'REMINDER', 'NEWSLETTER']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'TESTING']).optional(),
  tags: z.array(z.string()).optional(),
  previewData: z.record(z.any()).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/email/templates/[id] - Buscar template por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const template = await emailService.getTemplate(params.id)
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template não encontrado'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('Erro ao buscar template:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// PUT /api/email/templates/[id] - Atualizar template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = UpdateTemplateSchema.parse(body)
    
    const template = await emailService.updateTemplate(params.id, validatedData, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 })
    }
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({
        success: false,
        error: 'Template não encontrado'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// DELETE /api/email/templates/[id] - Deletar template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem deletar templates' }, { status: 403 })
    }

    await emailService.deleteTemplate(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Template deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar template:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({
        success: false,
        error: 'Template não encontrado'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}