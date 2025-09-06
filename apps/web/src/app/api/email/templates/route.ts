import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para criação de template
const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  category: z.enum(['TRANSACTIONAL', 'MARKETING', 'NOTIFICATION', 'SYSTEM', 'WELCOME', 'CONFIRMATION', 'REMINDER', 'NEWSLETTER']),
  tags: z.array(z.string()).optional(),
  previewData: z.record(z.any()).optional()
})

// Schema para filtros de listagem
const ListTemplatesSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(), // Será convertido para array
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
})

// GET /api/email/templates - Listar templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = ListTemplatesSchema.parse(params)
    
    const filters = {
      category: validatedParams.category,
      status: validatedParams.status,
      tags: validatedParams.tags ? validatedParams.tags.split(',') : undefined,
      search: validatedParams.search,
      page: validatedParams.page ? parseInt(validatedParams.page) : 1,
      limit: validatedParams.limit ? parseInt(validatedParams.limit) : 20
    }

    const result = await emailService.listTemplates(filters)
    
    return NextResponse.json({
      success: true,
      data: result.templates,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao listar templates:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// POST /api/email/templates - Criar template
export async function POST(request: NextRequest) {
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
    const validatedData = CreateTemplateSchema.parse(body)
    
    const template = await emailService.createTemplate(validatedData, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template criado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 })
    }
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json({
        success: false,
        error: 'Já existe um template com este slug'
      }, { status: 409 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}