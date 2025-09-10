'use client'

// Removido import de EmailTemplate do domínio (não é necessário neste módulo de UI)

// Tipos de templates predefinidos
export type PredefinedTemplateType = 
  | 'welcome'
  | 'password-reset'
  | 'email-verification'
  | 'course-enrollment'
  | 'group-invitation'
  | 'achievement-unlocked'
  | 'order-confirmation'
  | 'event-reminder'
  | 'newsletter'
  | 'notification'

// Interface para templates predefinidos
export interface PredefinedTemplate {
  id: PredefinedTemplateType
  name: string
  description: string
  category: 'auth' | 'notification' | 'marketing' | 'transactional'
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
  isSystem: boolean
}

// Tipo simplificado usado na UI para popular formulários de template de email
export interface SimpleEmailTemplate {
  name: string
  subject: string
  htmlContent: string
  textContent: string
  category: 'auth' | 'notification' | 'marketing' | 'transactional'
  variables: string[]
  isActive: boolean
  tags?: string[]
}

// Templates predefinidos do sistema
export const PREDEFINED_TEMPLATES: Record<PredefinedTemplateType, PredefinedTemplate> = {
  'welcome': {
    id: 'welcome',
    name: 'Boas-vindas',
    description: 'Template de boas-vindas para novos usuários',
    category: 'auth',
    subject: 'Bem-vindo(a) ao {{site.name}}, {{user.name}}!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Bem-vindo(a) ao {{site.name}}!</h1>
          <p style="color: #666; font-size: 16px;">Olá {{user.name}}, é um prazer tê-lo(a) conosco!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 15px;">Próximos Passos</h2>
          <ul style="color: #666; line-height: 1.6;">
            <li>Complete seu perfil para uma experiência personalizada</li>
            <li>Explore nossos cursos e conteúdos exclusivos</li>
            <li>Junte-se à nossa comunidade de estudantes</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{site.url}}/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Painel</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Se você tiver dúvidas, entre em contato conosco em {{support.email}}</p>
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Olá {{user.name}}!

Bem-vindo(a) ao {{site.name}}! É um prazer tê-lo(a) conosco.

Próximos Passos:
- Complete seu perfil para uma experiência personalizada
- Explore nossos cursos e conteúdos exclusivos
- Junte-se à nossa comunidade de estudantes

Acesse seu painel: {{site.url}}/dashboard

Se você tiver dúvidas, entre em contato conosco em {{support.email}}

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{site.name}}', '{{site.url}}', '{{support.email}}'],
    isSystem: true
  },

  'password-reset': {
    id: 'password-reset',
    name: 'Redefinição de Senha',
    description: 'Template para redefinição de senha',
    category: 'auth',
    subject: 'Redefinir sua senha - {{site.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Redefinir Senha</h1>
          <p style="color: #666;">Olá {{user.name}}, recebemos uma solicitação para redefinir sua senha.</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404;">⚠️ Se você não solicitou esta redefinição, ignore este email.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reset.url}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
        </div>
        
        <div style="color: #666; font-size: 14px; margin-top: 20px;">
          <p>Este link expira em 1 hora por segurança.</p>
          <p>Token: {{reset.token}}</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Olá {{user.name}},

Recebemos uma solicitação para redefinir sua senha no {{site.name}}.

Se você solicitou esta redefinição, clique no link abaixo:
{{reset.url}}

Token: {{reset.token}}

Este link expira em 1 hora por segurança.

Se você não solicitou esta redefinição, ignore este email.

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{site.name}}', '{{site.url}}', '{{reset.url}}', '{{reset.token}}'],
    isSystem: true
  },

  'email-verification': {
    id: 'email-verification',
    name: 'Verificação de Email',
    description: 'Template para verificação de email',
    category: 'auth',
    subject: 'Verifique seu email - {{site.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Verificar Email</h1>
          <p style="color: #666;">Olá {{user.name}}, confirme seu endereço de email para ativar sua conta.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verification.url}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verificar Email</a>
        </div>
        
        <div style="color: #666; font-size: 14px; margin-top: 20px;">
          <p>Código de verificação: {{verification.token}}</p>
          <p>Este link expira em 24 horas.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Olá {{user.name}},

Confirme seu endereço de email para ativar sua conta no {{site.name}}.

Clique no link abaixo para verificar:
{{verification.url}}

Código de verificação: {{verification.token}}

Este link expira em 24 horas.

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{site.name}}', '{{site.url}}', '{{verification.url}}', '{{verification.token}}'],
    isSystem: true
  },

  'course-enrollment': {
    id: 'course-enrollment',
    name: 'Inscrição em Curso',
    description: 'Template para confirmação de inscrição em curso',
    category: 'transactional',
    subject: 'Inscrição confirmada: {{course.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Inscrição Confirmada! 🎉</h1>
          <p style="color: #666;">Parabéns {{user.name}}, você foi inscrito(a) no curso:</p>
          <h2 style="color: #007bff; margin: 15px 0;">{{course.name}}</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">Detalhes do Curso</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Valor:</strong> {{course.price}}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Data de Início:</strong> {{course.startDate}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{course.url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Curso</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Parabéns {{user.name}}!

Você foi inscrito(a) no curso: {{course.name}}

Detalhes:
- Valor: {{course.price}}
- Data de Início: {{course.startDate}}

Acesse o curso: {{course.url}}

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{course.name}}', '{{course.price}}', '{{course.startDate}}', '{{course.url}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  },

  'group-invitation': {
    id: 'group-invitation',
    name: 'Convite para Grupo',
    description: 'Template para convite para participar de grupo',
    category: 'notification',
    subject: 'Convite para {{group.name}} - {{site.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Você foi convidado! 📨</h1>
          <p style="color: #666;">Olá {{user.name}}, você recebeu um convite para participar do grupo:</p>
          <h2 style="color: #007bff; margin: 15px 0;">{{group.name}}</h2>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{group.url}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Aceitar Convite</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Olá {{user.name}},

Você foi convidado(a) para participar do grupo: {{group.name}}

Para aceitar o convite, acesse: {{group.url}}

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{group.name}}', '{{group.url}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  },

  'achievement-unlocked': {
    id: 'achievement-unlocked',
    name: 'Conquista Desbloqueada',
    description: 'Template para notificação de conquista desbloqueada',
    category: 'notification',
    subject: 'Parabéns! Nova conquista desbloqueada: {{achievement.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">🏆 Conquista Desbloqueada!</h1>
          <p style="color: #666;">Parabéns {{user.name}}!</p>
          <h2 style="color: #ffc107; margin: 15px 0;">{{achievement.name}}</h2>
          <p style="color: #666; font-style: italic;">{{achievement.description}}</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0; color: #856404;">🎯 Você ganhou {{points.earned}} pontos!</p>
          <p style="margin: 5px 0 0 0; color: #856404;">Total de pontos: {{points.total}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{site.url}}/achievements" style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Todas as Conquistas</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
🏆 Conquista Desbloqueada!

Parabéns {{user.name}}!

Você desbloqueou: {{achievement.name}}
{{achievement.description}}

🎯 Você ganhou {{points.earned}} pontos!
Total de pontos: {{points.total}}

Veja todas suas conquistas: {{site.url}}/achievements

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{achievement.name}}', '{{achievement.description}}', '{{points.earned}}', '{{points.total}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  },

  'order-confirmation': {
    id: 'order-confirmation',
    name: 'Confirmação de Pedido',
    description: 'Template para confirmação de pedido/compra',
    category: 'transactional',
    subject: 'Pedido confirmado {{order.number}} - {{site.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Pedido Confirmado! ✅</h1>
          <p style="color: #666;">Obrigado pela sua compra, {{user.name}}!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">Detalhes do Pedido</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Número:</strong> {{order.number}}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Data:</strong> {{order.date}}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Total:</strong> {{order.total}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{site.url}}/orders/{{order.id}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Detalhes</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Dúvidas? Entre em contato: {{support.email}}</p>
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
Pedido Confirmado!

Obrigado pela sua compra, {{user.name}}!

Detalhes do Pedido:
- Número: {{order.number}}
- Data: {{order.date}}
- Total: {{order.total}}

Ver detalhes: {{site.url}}/orders/{{order.id}}

Dúvidas? Entre em contato: {{support.email}}

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{order.number}}', '{{order.date}}', '{{order.total}}', '{{order.id}}', '{{support.email}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  },

  'event-reminder': {
    id: 'event-reminder',
    name: 'Lembrete de Evento',
    description: 'Template para lembrete de evento próximo',
    category: 'notification',
    subject: 'Lembrete: {{event.name}} é amanhã!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">📅 Lembrete de Evento</h1>
          <p style="color: #666;">Olá {{user.name}}, não se esqueça!</p>
          <h2 style="color: #007bff; margin: 15px 0;">{{event.name}}</h2>
          <p style="color: #666;"><strong>Data:</strong> {{event.date}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{event.url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Detalhes do Evento</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
📅 Lembrete de Evento

Olá {{user.name}}, não se esqueça!

Evento: {{event.name}}
Data: {{event.date}}

Ver detalhes: {{event.url}}

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{event.name}}', '{{event.date}}', '{{event.url}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  },

  'newsletter': {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Template base para newsletter',
    category: 'marketing',
    subject: '📧 Newsletter {{site.name}} - {{month}} {{year}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">📧 Newsletter {{site.name}}</h1>
          <p style="color: #666;">{{month}} {{year}}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 15px;">Olá {{user.name}}!</h2>
          <p style="color: #666; line-height: 1.6;">Aqui estão as novidades e atualizações mais importantes deste mês.</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #333;">🎯 Destaques do Mês</h3>
          <p style="color: #666; line-height: 1.6;">Conteúdo personalizado da newsletter...</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{site.url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Visitar Site</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
          <p><a href="{{site.url}}/unsubscribe" style="color: #666;">Cancelar inscrição</a></p>
        </div>
      </div>
    `,
    textContent: `
📧 Newsletter {{site.name}} - {{month}} {{year}}

Olá {{user.name}}!

Aqui estão as novidades e atualizações mais importantes deste mês.

🎯 Destaques do Mês
Conteúdo personalizado da newsletter...

Visitar site: {{site.url}}

{{site.name}} - {{site.url}}
Cancelar inscrição: {{site.url}}/unsubscribe
    `,
    variables: ['{{user.name}}', '{{site.name}}', '{{site.url}}', '{{month}}', '{{year}}'],
    isSystem: false
  },

  'notification': {
    id: 'notification',
    name: 'Notificação Geral',
    description: 'Template genérico para notificações',
    category: 'notification',
    subject: '{{notification.title}} - {{site.name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">🔔 {{notification.title}}</h1>
          <p style="color: #666;">Olá {{user.name}},</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #666; line-height: 1.6; margin: 0;">{{notification.message}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{site.url}}/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Painel</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>{{site.name}} - {{site.url}}</p>
        </div>
      </div>
    `,
    textContent: `
🔔 {{notification.title}}

Olá {{user.name}},

{{notification.message}}

Acessar painel: {{site.url}}/dashboard

{{site.name}} - {{site.url}}
    `,
    variables: ['{{user.name}}', '{{notification.title}}', '{{notification.message}}', '{{site.name}}', '{{site.url}}'],
    isSystem: false
  }
}

// Função para obter template predefinido
export function getPredefinedTemplate(type: PredefinedTemplateType): PredefinedTemplate {
  return PREDEFINED_TEMPLATES[type]
}

// Função para listar todos os templates predefinidos
export function getAllPredefinedTemplates(): PredefinedTemplate[] {
  return Object.values(PREDEFINED_TEMPLATES)
}

// Função para obter templates por categoria
export function getTemplatesByCategory(category: 'auth' | 'notification' | 'marketing' | 'transactional'): PredefinedTemplate[] {
  return Object.values(PREDEFINED_TEMPLATES).filter(template => template.category === category)
}

// Função para converter template predefinido para um objeto simples usado na UI
export function convertToEmailTemplate(predefinedTemplate: PredefinedTemplate): SimpleEmailTemplate {
  return {
    name: predefinedTemplate.name,
    subject: predefinedTemplate.subject,
    htmlContent: predefinedTemplate.htmlContent,
    textContent: predefinedTemplate.textContent,
    category: predefinedTemplate.category,
    variables: predefinedTemplate.variables,
    isActive: true
  }
}