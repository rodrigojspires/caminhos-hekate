import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para criação de campanha
const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  templateId: z.string().min(1, 'Template é obrigatório'),
  fromEmail: z.string().email('Email remetente inválido'),
  fromName: z.string().min(1, 'Nome remetente é obrigatório'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  scheduledFor: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  segmentFilters: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional()
})

// Schema para listagem
const ListCampaignsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAUSED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'scheduledFor', 'name', 'totalRecipients']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// GET /api/email/campaigns - Listar campanhas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = ListCampaignsSchema.parse(params)

    const campaigns = await emailService.getCampaigns({
      page: validatedParams.page,
      limit: validatedParams.limit,
      status: validatedParams.status,
      search: validatedParams.search,
      sortBy: validatedParams.sortBy,
      sortOrder: validatedParams.sortOrder
    })

    return NextResponse.json({
      success: true,
      data: campaigns
    })
  } catch (error) {
    console.error('Erro ao listar campanhas:', error)
    
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

// POST /api/email/campaigns - Criar campanha
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateCampaignSchema.parse(body)
    
    // Converter scheduledFor para Date se fornecido
    const campaignData = {
      ...validatedData,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined
    }
    
    const campaign = await emailService.createCampaign(campaignData, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: campaign,
      message: 'Campanha criada com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar campanha:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}