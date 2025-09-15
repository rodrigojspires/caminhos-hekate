import { Resend } from 'resend'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Evitar instanciar o cliente Resend no escopo de módulo para não falhar no build sem API key
let resendClient: Resend | null = null
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Schema para envio de email
const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  from: z.string().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  templateSlug: z.string().optional(),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  trackingId: z.string().optional()
})

export type SendEmailInput = z.input<typeof SendEmailSchema>

class ResendEmailService {
  private readonly defaultFrom = process.env.DEFAULT_FROM_EMAIL || 'noreply@caminhosdehekate.com.br'
  private readonly defaultFromName = process.env.DEFAULT_FROM_NAME || 'Caminhos de Hekate'

  /**
   * Envia email usando Resend
   */
  async sendEmail(data: SendEmailInput): Promise<{ id: string; success: boolean }> {
    try {
      const validatedData = SendEmailSchema.parse(data)
      
      // Verificar se Resend está configurado
      const client = getResendClient()
      if (!client) {
        console.warn('RESEND_API_KEY não configurado, simulando envio de email')
        return this.simulateEmailSend(validatedData)
      }

      const fromEmail = validatedData.from || this.defaultFrom
      const fromName = validatedData.fromName || this.defaultFromName
      const from = `${fromName} <${fromEmail}>`

      const result = await client.emails.send({
        from,
        to: validatedData.to,
        subject: validatedData.subject,
        html: validatedData.html,
        text: validatedData.text,
        replyTo: validatedData.replyTo
      })

      if (result.error) {
        console.error('Erro ao enviar email via Resend:', result.error)
        throw new Error(`Falha no envio: ${result.error.message}`)
      }

      // Registrar envio no banco de dados
      if (validatedData.trackingId) {
        await this.trackEmailSent(validatedData.trackingId, result.data?.id || 'unknown')
      }

      return {
        id: result.data?.id || 'unknown',
        success: true
      }
    } catch (error) {
      console.error('Erro no serviço de email:', error)
      throw error
    }
  }

  /**
   * Simula envio de email quando Resend não está configurado
   */
  private async simulateEmailSend(data: SendEmailInput): Promise<{ id: string; success: boolean }> {
    const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log('📧 [SIMULAÇÃO] Email enviado:', {
      to: data.to,
      subject: data.subject,
      from: data.from || this.defaultFrom,
      id: simulatedId
    })

    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 100))

    // Registrar como enviado
    if (data.trackingId) {
      await this.trackEmailSent(data.trackingId, simulatedId)
    }

    return {
      id: simulatedId,
      success: true
    }
  }

  /**
   * Registra o envio do email no banco de dados
   */
  private async trackEmailSent(trackingId: string, emailId: string): Promise<void> {
    try {
      // Atualizar o registro de envio
      await prisma.emailSend.updateMany({
        where: { trackingId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          metadata: {
            resendId: emailId
          }
        }
      })

      // Criar evento de envio
      const emailSend = await prisma.emailSend.findFirst({
        where: { trackingId }
      })

      if (emailSend) {
        await prisma.emailEvent.create({
          data: {
            sendId: emailSend.id,
            type: 'SENT',
            data: {
              resendId: emailId,
              timestamp: new Date().toISOString()
            }
          }
        })
      }
    } catch (error) {
      console.error('Erro ao registrar envio de email:', error)
    }
  }

  /**
   * Envia email de convite para grupo
   */
  async sendGroupInviteEmail({
    toEmail,
    toName,
    groupName,
    inviterName,
    inviteUrl
  }: {
    toEmail: string
    toName?: string
    groupName: string
    inviterName: string
    inviteUrl: string
  }): Promise<{ id: string; success: boolean }> {
    const subject = `Convite para participar do grupo "${groupName}"`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Caminhos de Hekate</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin-top: 0;">Você foi convidado!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Olá${toName ? ` ${toName}` : ''}! 👋
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            <strong>${inviterName}</strong> convidou você para participar do grupo <strong>"${groupName}"</strong> na plataforma Caminhos de Hekate.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Aceitar Convite
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
          </p>
          <p style="color: #7c3aed; font-size: 14px; text-align: center; word-break: break-all;">
            ${inviteUrl}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px;">
            © 2024 Caminhos de Hekate. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `

    const text = `
Você foi convidado para o grupo "${groupName}"!

${inviterName} convidou você para participar do grupo "${groupName}" na plataforma Caminhos de Hekate.

Para aceitar o convite, acesse: ${inviteUrl}

---
Caminhos de Hekate
    `

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      priority: 'NORMAL'
    })
  }

  /**
   * Envia email de boas-vindas para novo membro
   */
  async sendWelcomeEmail({
    toEmail,
    toName,
    groupName
  }: {
    toEmail: string
    toName?: string
    groupName: string
  }): Promise<{ id: string; success: boolean }> {
    const subject = `Bem-vindo ao grupo "${groupName}"!`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Caminhos de Hekate</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
          <h2 style="color: #15803d; margin-top: 0;">🎉 Bem-vindo!</h2>
          <p style="color: #166534; font-size: 16px; line-height: 1.6;">
            Olá${toName ? ` ${toName}` : ''}!
          </p>
          <p style="color: #166534; font-size: 16px; line-height: 1.6;">
            Você agora faz parte do grupo <strong>"${groupName}"</strong>! Estamos muito felizes em tê-lo conosco.
          </p>
        </div>
        
        <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #a16207; margin-top: 0;">💡 Próximos passos:</h3>
          <ul style="color: #a16207; line-height: 1.6;">
            <li>Explore as atividades do grupo</li>
            <li>Participe das discussões</li>
            <li>Complete desafios e ganhe pontos</li>
            <li>Conecte-se com outros membros</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Acessar Minha Escola
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px;">
            © 2024 Caminhos de Hekate. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `

    const text = `
Bem-vindo ao grupo "${groupName}"!

Olá${toName ? ` ${toName}` : ''}!

Você agora faz parte do grupo "${groupName}"! Estamos muito felizes em tê-lo conosco.

Próximos passos:
- Explore as atividades do grupo
- Participe das discussões
- Complete desafios e ganhe pontos
- Conecte-se com outros membros

Acesse seu dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

---
Caminhos de Hekate
    `

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      priority: 'NORMAL'
    })
  }

  /**
   * Envia email de redefinição de senha
   */
  async sendPasswordResetEmail({
    toEmail,
    resetToken
  }: {
    toEmail: string
    resetToken: string
  }): Promise<{ id: string; success: boolean }> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    const subject = 'Redefinir sua senha - Caminhos de Hekate'
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Caminhos de Hekate</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
          <h2 style="color: #dc2626; margin-top: 0;">🔐 Redefinir Senha</h2>
          <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6;">
            Você solicitou a redefinição de sua senha. Clique no botão abaixo para continuar:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por segurança.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
          </p>
          <p style="color: #7c3aed; font-size: 14px; text-align: center; word-break: break-all;">
            ${resetUrl}
          </p>
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 20px;">
            Se você não solicitou esta redefinição, ignore este email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px;">
            © 2024 Caminhos de Hekate. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `

    const text = `
Redefinir Senha - Caminhos de Hekate

Você solicitou a redefinição de sua senha. Acesse o link abaixo para continuar:

${resetUrl}

Importante: Este link expira em 1 hora por segurança.

Se você não solicitou esta redefinição, ignore este email.

---
Caminhos de Hekate
    `

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      priority: 'HIGH'
    })
  }

  /**
   * Envia email de verificação de conta
   */
  async sendVerificationEmail({
    toEmail,
    verificationToken
  }: {
    toEmail: string
    verificationToken: string
  }): Promise<{ id: string; success: boolean }> {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
    const subject = 'Verificar seu email - Caminhos de Hekate'
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Caminhos de Hekate</h1>
        </div>
        
        <div style="background: #f0f9ff; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #0ea5e9;">
          <h2 style="color: #0c4a6e; margin-top: 0;">✉️ Verificar Email</h2>
          <p style="color: #0c4a6e; font-size: 16px; line-height: 1.6;">
            Obrigado por se cadastrar! Para completar seu registro, precisamos verificar seu endereço de email.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verificar Email
          </a>
        </div>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⏰ <strong>Lembrete:</strong> Este link expira em 24 horas.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
          </p>
          <p style="color: #7c3aed; font-size: 14px; text-align: center; word-break: break-all;">
            ${verificationUrl}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px;">
            © 2024 Caminhos de Hekate. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `

    const text = `
Verificar Email - Caminhos de Hekate

Obrigado por se cadastrar! Para completar seu registro, precisamos verificar seu endereço de email.

Clique no link abaixo para verificar:
${verificationUrl}

Lembrete: Este link expira em 24 horas.

---
Caminhos de Hekate
    `

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      priority: 'HIGH'
    })
  }
}

export const resendEmailService = new ResendEmailService()
export default resendEmailService
