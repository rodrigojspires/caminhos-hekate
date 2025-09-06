import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { Prisma } from '@prisma/client'
import { 
  CreateEmailTemplateSchema, 
  UpdateEmailTemplateSchema 
} from '@/lib/validations/settings'
import { z } from 'zod'

// Schema para filtros de templates de email
const EmailTemplateFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'subject', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// GET /api/admin/settings/email-templates - Listar templates de email
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = EmailTemplateFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: searchParams.get('sortOrder') || 'asc'
    })

    const skip = (filters.page - 1) * filters.limit
    
    const where = {
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { subject: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        select: {
          id: true,
          name: true,
          subject: true,
          createdAt: true,
          updatedAt: true,
          variables: true
        }
      }),
      prisma.emailTemplate.count({ where })
    ])

    return NextResponse.json({
      templates,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar templates de email:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/settings/email-templates - Criar template de email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreateEmailTemplateSchema.parse(body)

    // Verificar se já existe um template com o mesmo nome
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { name: data.name }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Já existe um template com este nome' },
        { status: 400 }
      )
    }

    // Validar variáveis no conteúdo
    const validateVariables = (content: string, variables: string[]) => {
      const usedVariables = content.match(/\{\{\s*(\w+)\s*\}\}/g) || []
      const extractedVars = usedVariables.map(v => v.replace(/[{}\s]/g, ''))
      
      const undefinedVars = extractedVars.filter(v => !variables.includes(v))
      if (undefinedVars.length > 0) {
        throw new Error(`Variáveis não definidas encontradas: ${undefinedVars.join(', ')}`)
      }
    }

    try {
      if (data.htmlContent) {
        validateVariables(data.htmlContent, data.variables || [])
      }
      if (data.textContent) {
        validateVariables(data.textContent, data.variables || [])
      }
      validateVariables(data.subject, data.variables || [])
    } catch (error) {
      return NextResponse.json(
        { error: `Erro na validação de variáveis: ${error}` },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        subject: data.subject,
        htmlContent: data.htmlContent || '',
        textContent: data.textContent,
        variables: data.variables || [],
        createdBy: session.user.id
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template de email:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}