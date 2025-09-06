import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status === 'active' ? 'ACTIVE' : 'ARCHIVED'
    }

    if (type && type !== 'all') {
      where.category = type === 'system' ? 'SYSTEM' : 'CUSTOM'
    }

    // Buscar templates com contagem total
    const [templates, totalCount] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        
        orderBy: {
          updatedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.emailTemplate.count({ where })
    ])

    // Formatar dados para o frontend
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      content: template.htmlContent,
      variables: template.variables || [],
      isSystem: template.category === 'SYSTEM',
      isActive: template.status === 'ACTIVE',
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      updatedBy: {
        name: 'Sistema'
      },
      usageCount: 0
    }))

    // Calcular estatísticas
    const stats = {
      total: totalCount,
      active: await prisma.emailTemplate.count({ 
        where: { status: 'ACTIVE' } 
      }),
      system: await prisma.emailTemplate.count({ 
        where: { category: 'SYSTEM' } 
      }),
      totalUsage: await prisma.emailSend.count()
    }

    return NextResponse.json({
      templates: formattedTemplates,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar templates de email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subject, content, variables, category, status } = body

    // Validações básicas
    if (!name || !subject || !content) {
      return NextResponse.json(
        { error: 'Nome, assunto e conteúdo são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe um template com o mesmo nome
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { name }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Já existe um template com este nome' },
        { status: 409 }
      )
    }

    // Criar novo template
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        subject,
        htmlContent: content,
        variables: variables || [],
        category: category || 'TRANSACTIONAL',
        status: status || 'DRAFT',
        createdBy: 'system'
      },

    })

    // Formatar resposta
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      subject: template.subject,
      content: template.htmlContent,
      variables: template.variables || [],
      isSystem: template.category === 'SYSTEM',
      isActive: template.status === 'ACTIVE',
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      updatedBy: {
        name: 'Sistema'
      },
      usageCount: 0
    }

    return NextResponse.json(formattedTemplate, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template de email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}