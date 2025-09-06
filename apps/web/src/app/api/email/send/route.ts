import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para envio de email
const SendEmailSchema = z.object({
  templateSlug: z.string().optional(),
  toEmail: z.string().email('Email inválido'),
  toName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  scheduledFor: z.string().datetime().optional(),
  campaignId: z.string().optional(),
  recipientId: z.string().optional()
})

// Schema para envio em lote
const BulkSendSchema = z.object({
  templateSlug: z.string(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    variables: z.record(z.any()).optional(),
    recipientId: z.string().optional()
  })).min(1, 'Pelo menos um destinatário é obrigatório'),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  scheduledFor: z.string().datetime().optional(),
  campaignId: z.string().optional()
})

// POST /api/email/send - Enviar email individual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se tem permissão para enviar emails
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = SendEmailSchema.parse(body)
    
    // Converter scheduledFor para Date se fornecido
    const emailData = {
      ...validatedData,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined
    }
    
    const emailSend = await emailService.sendEmail(emailData, validatedData.recipientId)
    
    return NextResponse.json({
      success: true,
      data: emailSend,
      message: validatedData.scheduledFor ? 'Email agendado com sucesso' : 'Email enviado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    
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

// PUT /api/email/send - Envio em lote
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se tem permissão para enviar emails em lote
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = BulkSendSchema.parse(body)
    
    const results = []
    const errors = []

    // Processar cada destinatário
    for (const recipient of validatedData.recipients) {
      try {
        const emailData = {
          templateSlug: validatedData.templateSlug,
          toEmail: recipient.email,
          toName: recipient.name,
          fromEmail: validatedData.fromEmail,
          fromName: validatedData.fromName,
          subject: '', // Será preenchido pelo template
          htmlContent: '', // Será preenchido pelo template
          textContent: undefined,
          variables: recipient.variables,
          priority: validatedData.priority,
          scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
          campaignId: validatedData.campaignId
        }
        
        const emailSend = await emailService.sendEmail(emailData, recipient.recipientId)
        results.push({
          email: recipient.email,
          success: true,
          emailSendId: emailSend.id
        })
      } catch (error) {
        console.error(`Erro ao enviar para ${recipient.email}:`, error)
        errors.push({
          email: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total: validatedData.recipients.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: `Processados ${validatedData.recipients.length} emails: ${results.length} enviados, ${errors.length} falharam`
    })
  } catch (error) {
    console.error('Erro no envio em lote:', error)
    
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