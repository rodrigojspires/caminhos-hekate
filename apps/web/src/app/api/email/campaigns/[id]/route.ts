import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// Schema para atualização de campanha
const UpdateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  templateId: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  subject: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  segmentFilters: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAUSED', 'CANCELLED']).optional()
})

// GET /api/email/campaigns/[id] - Obter campanha específica
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const campaign = await emailService.getCampaign(params.id)
    
    if (!campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campanha não encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Erro ao obter campanha:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// PUT /api/email/campaigns/[id] - Atualizar campanha
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const validatedData = UpdateCampaignSchema.parse(body)
    
    // Converter scheduledFor para Date se fornecido
    const updateData = {
      ...validatedData,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
      updatedById: session.user.id
    }
    
    const campaign = await emailService.updateCampaign(params.id, updateData)
    
    if (!campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campanha não encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: campaign,
      message: 'Campanha atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error)
    
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

// DELETE /api/email/campaigns/[id] - Deletar campanha
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    if (!['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    await emailService.deleteCampaign(params.id)

    return NextResponse.json({
      success: true,
      message: 'Campanha deletada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar campanha:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}