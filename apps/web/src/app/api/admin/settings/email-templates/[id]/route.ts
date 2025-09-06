import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { UpdateEmailTemplateSchema } from '@/lib/validations/settings'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/settings/email-templates/[id] - Buscar template por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erro ao buscar template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings/email-templates/[id] - Atualizar template
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = UpdateEmailTemplateSchema.parse(body)

    // Verificar se o template existe
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o nome já existe em outro template (se o nome está sendo alterado)
    if (data.name && data.name !== existingTemplate.name) {
      const nameExists = await prisma.emailTemplate.findFirst({
        where: { name: data.name }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'Já existe um template com este nome' },
          { status: 400 }
        )
      }
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

    const variables = Array.isArray(data.variables) ? data.variables : 
                     Array.isArray(existingTemplate.variables) ? existingTemplate.variables as string[] : []
    
    try {
      if (data.htmlContent) {
        validateVariables(data.htmlContent, variables)
      }
      if (data.textContent) {
        validateVariables(data.textContent, variables)
      }
      if (data.subject) {
        validateVariables(data.subject, variables)
      }
    } catch (error) {
      return NextResponse.json(
        { error: `Erro na validação de variáveis: ${error}` },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    
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

// DELETE /api/admin/settings/email-templates/[id] - Excluir template
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se o template existe
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se é um template do sistema que não pode ser excluído
    const systemTemplates = [
      'welcome',
      'password-reset',
      'email-verification',
      'order-confirmation',
      'payment-success'
    ]

    if (systemTemplates.includes(existingTemplate.name)) {
      return NextResponse.json(
        { error: 'Este template é do sistema e não pode ser excluído' },
        { status: 400 }
      )
    }

    await prisma.emailTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'Template excluído com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}