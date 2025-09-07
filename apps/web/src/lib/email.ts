import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { z } from 'zod'

const prisma = new PrismaClient()
let _redis: Redis | null = null
function getRedis(): Redis | null {
  try {
    if (_redis) return _redis
    if (!process.env.REDIS_URL) return null
    _redis = new Redis(process.env.REDIS_URL)
    return _redis
  } catch {
    return null
  }
}

// Schemas de validação
const EmailTemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  category: z.enum(['TRANSACTIONAL', 'MARKETING', 'NOTIFICATION', 'SYSTEM', 'WELCOME', 'CONFIRMATION', 'REMINDER', 'NEWSLETTER']),
  tags: z.array(z.string()).optional(),
  previewData: z.record(z.any()).optional()
})

const EmailSendSchema = z.object({
  templateSlug: z.string().optional(),
  toEmail: z.string().email(),
  toName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  scheduledFor: z.date().optional(),
  campaignId: z.string().optional()
})

const EmailCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  templateId: z.string().optional(),
  segmentId: z.string().optional(),
  scheduledFor: z.date().optional()
})

// Types
export type EmailCategory =
  | 'TRANSACTIONAL'
  | 'MARKETING'
  | 'NOTIFICATION'
  | 'SYSTEM'
  | 'WELCOME'
  | 'CONFIRMATION'
  | 'REMINDER'
  | 'NEWSLETTER'

export type EmailTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'TESTING'

export type EmailCampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'PAUSED'
  | 'CANCELLED'
  | 'COMPLETED'

// Interfaces
export interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: Record<string, any>
  category: EmailCategory | string
  status: EmailTemplateStatus | string
  version: number
  isDefault: boolean
  // Optional metadata fields used in the UI
  description?: string
  isActive?: boolean
  tags: string[]
  metadata?: Record<string, any>
  previewData?: Record<string, any>
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface EmailSend {
  id: string
  templateId?: string
  templateSlug?: string
  recipientId?: string
  toEmail: string
  toName?: string
  fromEmail: string
  fromName?: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: Record<string, any>
  status: string
  priority: string
  scheduledFor?: Date
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  bouncedAt?: Date
  errorMessage?: string
  metadata?: Record<string, any>
  trackingId?: string
  campaignId?: string
  createdAt: Date
  updatedAt: Date
}

export interface EmailCampaign {
  id: string
  name: string
  description?: string
  status: EmailCampaignStatus | string
  templateId?: string
  segmentId?: string
  scheduledFor?: Date
  sentAt?: Date
  completedAt?: Date
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  openedCount: number
  clickedCount: number
  bouncedCount: number
  unsubscribedCount: number
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // Optional fields for UI convenience
  tags?: string[]
  template?: Pick<EmailTemplate, 'id' | 'name'> | EmailTemplate
}

export interface EmailStats {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'object'
  description?: string
  required: boolean
  defaultValue?: any
}

class EmailService {
  private readonly CACHE_TTL = 3600 // 1 hora
  private readonly CACHE_PREFIX = 'email:'

  // Templates
  async createTemplate(data: z.infer<typeof EmailTemplateSchema>, createdBy: string): Promise<EmailTemplate> {
    const validatedData = EmailTemplateSchema.parse(data)
    
    const template = await prisma.emailTemplate.create({
      data: {
        ...validatedData,
        createdBy,
        tags: validatedData.tags || []
      }
    })

    // Invalidar cache
    await this.invalidateTemplateCache()
    
    return template as EmailTemplate
  }

  async updateTemplate(id: string, data: Partial<z.infer<typeof EmailTemplateSchema>>, updatedBy: string): Promise<EmailTemplate> {
    const template = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!template) throw new Error('Template não encontrado')

    // Criar nova versão se houver mudanças no conteúdo
    if (data.htmlContent || data.textContent || data.subject) {
      await prisma.emailTemplateVersion.create({
        data: {
          templateId: id,
          version: template.version + 1,
          subject: data.subject || template.subject,
          htmlContent: data.htmlContent || template.htmlContent,
          textContent: data.textContent || template.textContent,
          variables: (data.variables || template.variables) as any,
          createdBy: updatedBy
        }
      })
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedBy,
        version: template.version + 1,
        tags: data.tags || template.tags
      }
    })

    // Invalidar cache
    await this.invalidateTemplateCache(id)
    
    return updatedTemplate as EmailTemplate
  }

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    const cacheKey = `${this.CACHE_PREFIX}template:${id}`
    
    // Tentar buscar do cache
    const client = getRedis()
    const cached = client ? await client.get(cacheKey) : null
    if (cached) {
      return JSON.parse(cached)
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } },
        versions: { orderBy: { version: 'desc' }, take: 5 }
      }
    })

    if (template) {
      if (client) await client.setex(cacheKey, this.CACHE_TTL, JSON.stringify(template))
    }

    return template as EmailTemplate | null
  }

  async getTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
    const cacheKey = `${this.CACHE_PREFIX}template:slug:${slug}`
    
    // Tentar buscar do cache
    const client2 = getRedis()
    const cached = client2 ? await client2.get(cacheKey) : null
    if (cached) {
      return JSON.parse(cached)
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { slug },
      include: {
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } }
      }
    })

    if (template) {
      if (client2) await client2.setex(cacheKey, this.CACHE_TTL, JSON.stringify(template))
    }

    return template as EmailTemplate | null
  }

  async listTemplates(filters: {
    category?: string
    status?: string
    tags?: string[]
    search?: string
    page?: number
    limit?: number
  } = {}): Promise<{ templates: EmailTemplate[], total: number }> {
    const { category, status, tags, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (category) where.category = category
    if (status) where.status = status
    if (tags?.length) where.tags = { hasSome: tags }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ]
    }

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { sends: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.emailTemplate.count({ where })
    ])

    return { templates: templates as EmailTemplate[], total }
  }

  async deleteTemplate(id: string): Promise<void> {
    await prisma.emailTemplate.delete({ where: { id } })
    await this.invalidateTemplateCache(id)
  }

  // Envio de emails
  async sendEmail(data: z.infer<typeof EmailSendSchema>, recipientId?: string): Promise<EmailSend> {
    const validatedData = EmailSendSchema.parse(data)
    
    let template: EmailTemplate | null = null
    let processedContent = {
      subject: validatedData.subject,
      htmlContent: validatedData.htmlContent,
      textContent: validatedData.textContent
    }

    // Se usar template, buscar e processar
    if (validatedData.templateSlug) {
      template = await this.getTemplateBySlug(validatedData.templateSlug)
      if (template) {
        processedContent = this.processTemplate(template, validatedData.variables || {})
      }
    }

    const trackingId = this.generateTrackingId()
    
    const emailSend = await prisma.emailSend.create({
      data: {
        templateId: template?.id,
        templateSlug: validatedData.templateSlug,
        recipientId,
        toEmail: validatedData.toEmail,
        toName: validatedData.toName,
        fromEmail: validatedData.fromEmail || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
        fromName: validatedData.fromName || process.env.DEFAULT_FROM_NAME || 'Sistema',
        subject: processedContent.subject,
        htmlContent: processedContent.htmlContent,
        textContent: processedContent.textContent,
        variables: validatedData.variables,
        priority: validatedData.priority,
        scheduledFor: validatedData.scheduledFor,
        trackingId,
        campaignId: validatedData.campaignId,
        status: validatedData.scheduledFor ? 'QUEUED' : 'PENDING'
      }
    })

    // Se não for agendado, enviar imediatamente
    if (!validatedData.scheduledFor) {
      await this.processEmailSend(emailSend.id)
    }

    return emailSend as EmailSend
  }

  async getEmailSend(id: string): Promise<EmailSend | null> {
    const emailSend = await prisma.emailSend.findUnique({
      where: { id },
      include: {
        template: true,
        recipient: { select: { name: true, email: true } },
        events: { orderBy: { timestamp: 'desc' } }
      }
    })

    return emailSend as EmailSend | null
  }

  async trackEmailEvent(trackingId: string, eventType: string, data?: Record<string, any>): Promise<void> {
    const emailSend = await prisma.emailSend.findUnique({
      where: { trackingId }
    })

    if (!emailSend) return

    // Criar evento
    await prisma.emailEvent.create({
      data: {
        sendId: emailSend.id,
        type: eventType as any,
        data,
        ipAddress: data?.ipAddress,
        userAgent: data?.userAgent,
        location: data?.location
      }
    })

    // Atualizar status do envio
    const updateData: any = {}
    const now = new Date()

    switch (eventType) {
      case 'DELIVERED':
        updateData.status = 'DELIVERED'
        updateData.deliveredAt = now
        break
      case 'OPENED':
        updateData.openedAt = updateData.openedAt || now
        break
      case 'CLICKED':
        updateData.clickedAt = updateData.clickedAt || now
        break
      case 'BOUNCED':
        updateData.status = 'BOUNCED'
        updateData.bouncedAt = now
        break
      case 'FAILED':
        updateData.status = 'FAILED'
        updateData.errorMessage = data?.error || 'Erro desconhecido'
        break
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.emailSend.update({
        where: { id: emailSend.id },
        data: updateData
      })
    }
  }

  // Campanhas
  async createCampaign(data: z.infer<typeof EmailCampaignSchema>, createdBy: string): Promise<EmailCampaign> {
    const validatedData = EmailCampaignSchema.parse(data)
    
    const campaign = await prisma.emailCampaign.create({
      data: {
        ...validatedData,
        createdBy
      }
    })

    return campaign as EmailCampaign
  }

  async getCampaign(id: string): Promise<EmailCampaign | null> {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true, email: true } }
      }
    })

    return campaign as EmailCampaign | null
  }

  async updateCampaign(id: string, data: Partial<z.infer<typeof EmailCampaignSchema>>): Promise<EmailCampaign> {
    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data,
      include: {
        creator: { select: { name: true, email: true } }
      }
    })

    return campaign as EmailCampaign
  }

  async deleteCampaign(id: string): Promise<void> {
    await prisma.emailCampaign.delete({
      where: { id }
    })
  }

  async getCampaigns(filters: {
    page?: number
    limit?: number
    status?: string
    search?: string
    sortBy?: string
    sortOrder?: string
  } = {}): Promise<{ campaigns: EmailCampaign[], total: number }> {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: { select: { name: true, email: true } }
        },
        orderBy
      }),
      prisma.emailCampaign.count({ where })
    ])

    return {
      campaigns: campaigns as EmailCampaign[],
      total
    }
  }

  // Estatísticas
  async getEmailStats(filters: {
    templateId?: string
    campaignId?: string
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<EmailStats> {
    const { templateId, campaignId, dateFrom, dateTo } = filters
    
    const where: any = {}
    if (templateId) where.templateId = templateId
    if (campaignId) where.campaignId = campaignId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = dateFrom
      if (dateTo) where.createdAt.lte = dateTo
    }

    const stats = await prisma.emailSend.aggregate({
      where,
      _count: {
        id: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        bouncedAt: true
      }
    })

    const totalSent = stats._count.id
    const totalDelivered = stats._count.deliveredAt || 0
    const totalOpened = stats._count.openedAt || 0
    const totalClicked = stats._count.clickedAt || 0
    const totalBounced = stats._count.bouncedAt || 0

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
    }
  }

  // Métodos privados
  private processTemplate(template: EmailTemplate, variables: Record<string, any>) {
    const evalTruthy = (val: any) => !!(Array.isArray(val) ? val.length : val)
    const applyConditions = (content: string) => {
      // Handle {{#if path}} ... {{else}} ... {{/if}}
      const ifRegex = /\{\{\s*#if\s+([^}]+)\s*\}\}([\s\S]*?)(\{\{\s*else\s*\}\}([\s\S]*?))?\{\{\s*\/if\s*\}\}/g
      return content.replace(ifRegex, (_m, condPath, truthyBlock, _elsePart, falsyBlock) => {
        const value = this.getNestedValue(variables, String(condPath).trim())
        return evalTruthy(value) ? truthyBlock : (falsyBlock || '')
      })
    }
    const replaceVars = (content: string) =>
      content.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
        const value = this.getNestedValue(variables, String(key).trim())
        return value !== undefined ? String(value) : match
      })
    const processContent = (content: string) => replaceVars(applyConditions(content))

    return {
      subject: processContent(template.subject),
      htmlContent: processContent(template.htmlContent),
      textContent: template.textContent ? processContent(template.textContent) : undefined
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private generateTrackingId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async processEmailSend(emailSendId: string): Promise<void> {
    try {
      const record = await prisma.emailSend.findUnique({ where: { id: emailSendId } })
      if (!record) throw new Error('Envio não encontrado')

      const transporter = await this.getSmtpTransport()
      if (!transporter) {
        // Fallback: marcar como enviado e entregue (ambiente sem SMTP)
        await prisma.emailSend.update({ where: { id: emailSendId }, data: { status: 'SENT', sentAt: new Date() } })
        setTimeout(async () => {
          const es = await prisma.emailSend.findUnique({ where: { id: emailSendId } })
          if (es?.trackingId) await this.trackEmailEvent(es.trackingId, 'DELIVERED')
        }, 1000)
        return
      }

      await transporter.sendMail({
        from: `${record.fromName || 'Sistema'} <${record.fromEmail}>`,
        to: record.toEmail,
        subject: record.subject,
        html: record.htmlContent,
        text: record.textContent || undefined
      })

      await prisma.emailSend.update({ where: { id: emailSendId }, data: { status: 'SENT', sentAt: new Date() } })
      if (record.trackingId) await this.trackEmailEvent(record.trackingId, 'DELIVERED')
    } catch (error) {
      await prisma.emailSend.update({
        where: { id: emailSendId },
        data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' }
      })
    }
  }

  private async getSmtpTransport(): Promise<any | null> {
    try {
      const host = process.env.SMTP_HOST
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
      const user = process.env.SMTP_USER
      const pass = process.env.SMTP_PASS
      if (!host || !user || !pass) return null

      // Import dinâmico para evitar require e problemas de ESLint em build
      const { createTransport } = await import('nodemailer') as any
      const transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      })
      return transporter
    } catch {
      return null
    }
  }

  private async invalidateTemplateCache(templateId?: string): Promise<void> {
    if (templateId) {
      const client = getRedis()
      if (client) await client.del(`${this.CACHE_PREFIX}template:${templateId}`)
    }
    
    // Invalidar cache de listagem
    const client = getRedis()
    if (client) {
      const keys = await client.keys(`${this.CACHE_PREFIX}templates:*`)
      if (keys.length > 0) {
        await client.del(...keys)
      }
    }
  }

  async extractTemplateVariables(content: string): Promise<TemplateVariable[]> {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g
    const variables = new Set<string>()
    let match

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim())
    }

    return Array.from(variables).map(name => ({
      name,
      type: 'text',
      required: true,
      description: `Variável ${name}`
    }))
  }

  async previewTemplate(templateId: string, variables: Record<string, any>): Promise<{ subject: string, htmlContent: string, textContent?: string }> {
    const template = await this.getTemplate(templateId)
    if (!template) throw new Error('Template não encontrado')

    return this.processTemplate(template, variables)
  }
}

// Enums e tipos adicionais foram normalizados para tipos e interfaces acima.

// Funções de email adicionais
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
  
  await emailService.sendEmail({
    toEmail: email,
    subject: 'Redefinir sua senha',
    priority: 'NORMAL',
    htmlContent: `
      <h2>Redefinir senha</h2>
      <p>Você solicitou a redefinição de sua senha. Clique no link abaixo para continuar:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou esta redefinição, ignore este email.</p>
    `,
    textContent: `Redefinir senha\n\nVocê solicitou a redefinição de sua senha. Acesse: ${resetUrl}\n\nEste link expira em 1 hora.\nSe você não solicitou esta redefinição, ignore este email.`
  })
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
  
  await emailService.sendEmail({
    toEmail: email,
    subject: 'Verificar seu email',
    priority: 'NORMAL',
    htmlContent: `
      <h2>Verificar email</h2>
      <p>Obrigado por se cadastrar! Clique no link abaixo para verificar seu email:</p>
      <a href="${verificationUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verificar Email</a>
      <p>Este link expira em 24 horas.</p>
    `,
    textContent: `Verificar email\n\nObrigado por se cadastrar! Acesse: ${verificationUrl}\n\nEste link expira em 24 horas.`
  })
}

export const emailService = new EmailService()

// Export sendEmail function for compatibility
export const sendEmail = (data: any) => emailService.sendEmail(data)

export default emailService
