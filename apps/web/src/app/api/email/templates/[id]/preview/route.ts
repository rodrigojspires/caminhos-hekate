import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para preview
const PreviewSchema = z.object({
  variables: z.record(z.any()).optional().default({})
})

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/email/templates/[id]/preview - Preview do template com variáveis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { variables } = PreviewSchema.parse(body)
    
    const preview = await emailService.previewTemplate(params.id, variables)
    
    return NextResponse.json({
      success: true,
      data: preview
    })
  } catch (error) {
    console.error('Erro ao gerar preview:', error)
    
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

// GET /api/email/templates/[id]/variables - Extrair variáveis do template
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

    // Extrair variáveis do conteúdo HTML e texto
    const htmlVariables = await emailService.extractTemplateVariables(template.htmlContent)
    const textVariables = template.textContent 
      ? await emailService.extractTemplateVariables(template.textContent)
      : []
    const subjectVariables = await emailService.extractTemplateVariables(template.subject)

    // Combinar e remover duplicatas
    const allVariables = [...htmlVariables, ...textVariables, ...subjectVariables]
    const uniqueVariables = allVariables.reduce((acc, variable) => {
      const existing = acc.find(v => v.name === variable.name)
      if (!existing) {
        acc.push(variable)
      }
      return acc
    }, [] as typeof htmlVariables)

    return NextResponse.json({
      success: true,
      data: {
        variables: uniqueVariables,
        predefinedVariables: template.variables || {},
        previewData: template.previewData || {}
      }
    })
  } catch (error) {
    console.error('Erro ao extrair variáveis:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}