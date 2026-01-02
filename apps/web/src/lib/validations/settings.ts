import { z } from 'zod'

// ==========================================
// ENUMS
// ==========================================

export const SettingCategorySchema = z.enum([
  'GENERAL',
  'EMAIL',
  'PAYMENT',
  'SECURITY',
  'INTEGRATIONS',
  'APPEARANCE',
  'NOTIFICATIONS',
  'GAMIFICATION'
])

export const SettingTypeSchema = z.enum([
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'JSON',
  'TEXT',
  'URL',
  'EMAIL'
])

export const NotificationChannelSchema = z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
export const NotificationTypeSchema = z.enum([
  'NEW_LESSON',
  'NEW_POST',
  'COMMENT_REPLY',
  'COURSE_COMPLETED',
  'SUBSCRIPTION_EXPIRING',
  'ORDER_STATUS',
  'SYSTEM_ANNOUNCEMENT',
  'SECURITY_ALERT'
])

// ==========================================
// SYSTEM SETTINGS SCHEMAS
// ==========================================

export const SystemSettingsSchema = z.object({
  id: z.string().cuid().optional(),
  key: z.string().min(1, 'Chave é obrigatória').max(100, 'Chave deve ter no máximo 100 caracteres'),
  value: z.string().min(1, 'Valor é obrigatório'),
  type: SettingTypeSchema,
  category: SettingCategorySchema,
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  validation: z.string().optional(), // Regex ou outras validações
  isPublic: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateSystemSettingsSchema = SystemSettingsSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateSystemSettingsSchema = SystemSettingsSchema.partial().omit({ 
  id: true, 
  key: true, 
  createdAt: true, 
  updatedAt: true 
})

// ==========================================
// EMAIL TEMPLATE SCHEMAS
// ==========================================

export const EmailTemplateSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  subject: z.string().min(1, 'Assunto é obrigatório').max(200, 'Assunto deve ter no máximo 200 caracteres'),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  textContent: z.string().optional(),
  variables: z.array(z.string()).default([]), // Variáveis disponíveis no template
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateEmailTemplateSchema = EmailTemplateSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateEmailTemplateSchema = EmailTemplateSchema.partial().omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

// ==========================================
// WHATSAPP TEMPLATE SCHEMAS
// ==========================================

export const WhatsAppTemplateSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-_]+$/, 'Slug deve conter apenas letras minúsculas, números, hífens e underscores'),
  content: z.string().min(1, 'Conteúdo é obrigatório').max(1000, 'Conteúdo deve ter no máximo 1000 caracteres'),
  variables: z.array(z.string()).default([]), // Variáveis disponíveis no template
  category: z.string().max(50, 'Categoria deve ter no máximo 50 caracteres').optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateWhatsAppTemplateSchema = WhatsAppTemplateSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateWhatsAppTemplateSchema = WhatsAppTemplateSchema.partial().omit({ 
  id: true, 
  slug: true, 
  createdAt: true, 
  updatedAt: true 
})

// ==========================================
// NOTIFICATION PREFERENCE SCHEMAS
// ==========================================

export const NotificationPreferenceSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid('ID do usuário deve ser válido'),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  enabled: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateNotificationPreferenceSchema = NotificationPreferenceSchema.omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateNotificationPreferenceSchema = z.object({
  enabled: z.boolean()
})

// ==========================================
// NOTIFICATION SCHEMAS
// ==========================================

export const NotificationSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid('ID do usuário deve ser válido'),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem deve ter no máximo 1000 caracteres'),
  data: z.record(z.any()).optional(), // Dados adicionais da notificação
  isRead: z.boolean().default(false),
  readAt: z.date().optional(),
  sentAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateNotificationSchema = NotificationSchema.omit({ 
  id: true, 
  isRead: true, 
  readAt: true, 
  sentAt: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  readAt: z.date().optional()
})

// ==========================================
// SETTINGS FORM SCHEMAS
// ==========================================

// Schema para configurações gerais do sistema
export const GeneralSettingsSchema = z.object({
  siteName: z.string().min(1, 'Nome do site é obrigatório').max(100),
  siteDescription: z.string().max(500).optional(),
  siteUrl: z.string().url('URL deve ser válida'),
  logoUrl: z.string().url('URL do logo deve ser válida').optional(),
  faviconUrl: z.string().url('URL do favicon deve ser válida').optional(),
  contactEmail: z.string().email('Email deve ser válido'),
  supportEmail: z.string().email('Email deve ser válido').optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  language: z.string().default('pt-BR'),
  currency: z.string().default('BRL'),
  maintenanceMode: z.boolean().default(false),
  registrationEnabled: z.boolean().default(true),
  emailVerificationRequired: z.boolean().default(true)
})

// Schema para configurações de segurança
export const SecuritySettingsSchema = z.object({
  passwordMinLength: z.number().int().min(6).max(50).default(8),
  passwordRequireUppercase: z.boolean().default(true),
  passwordRequireLowercase: z.boolean().default(true),
  passwordRequireNumbers: z.boolean().default(true),
  passwordRequireSymbols: z.boolean().default(false),
  sessionTimeout: z.number().int().min(15).max(1440).default(60), // em minutos
  maxLoginAttempts: z.number().int().min(3).max(10).default(5),
  lockoutDuration: z.number().int().min(5).max(60).default(15), // em minutos
  twoFactorEnabled: z.boolean().default(false),
  ipWhitelistEnabled: z.boolean().default(false),
  ipWhitelist: z.array(z.string().ip()).default([])
})

// Schema para configurações de email
export const EmailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'Host SMTP é obrigatório'),
  smtpPort: z.number().int().min(1).max(65535).default(587),
  smtpUsername: z.string().min(1, 'Usuário SMTP é obrigatório'),
  smtpPassword: z.string().min(1, 'Senha SMTP é obrigatória'),
  smtpSecure: z.boolean().default(true),
  fromEmail: z.string().email('Email remetente deve ser válido'),
  fromName: z.string().min(1, 'Nome remetente é obrigatório'),
  replyToEmail: z.string().email('Email de resposta deve ser válido').optional(),
  emailEnabled: z.boolean().default(true)
})

// Schema para configurações de pagamento
export const PaymentSettingsSchema = z.object({
  stripePublicKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']).optional(),
  paymentEnabled: z.boolean().default(true),
  subscriptionEnabled: z.boolean().default(true),
  trialPeriodDays: z.number().int().min(0).max(365).default(7)
})

// ==========================================
// QUERY SCHEMAS
// ==========================================

export const SettingsFiltersSchema = z.object({
  search: z.string().optional(),
  category: SettingCategorySchema.optional(),
  type: SettingTypeSchema.optional(),
  isPublic: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['key', 'label', 'category', 'createdAt', 'updatedAt']).default('category'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const EmailTemplateFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'slug', 'category', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const NotificationFiltersSchema = z.object({
  userId: z.string().cuid().optional(),
  type: NotificationTypeSchema.optional(),
  channel: NotificationChannelSchema.optional(),
  isRead: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'type', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// ==========================================
// BULK OPERATIONS SCHEMAS
// ==========================================

export const BulkUpdateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string().min(1)
  })).min(1, 'Pelo menos uma configuração deve ser fornecida')
})

export const BulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, 'Pelo menos um ID deve ser fornecido')
})

// ==========================================
// TYPE EXPORTS
// ==========================================

export type SystemSettings = z.infer<typeof SystemSettingsSchema>
export type CreateSystemSettings = z.infer<typeof CreateSystemSettingsSchema>
export type UpdateSystemSettings = z.infer<typeof UpdateSystemSettingsSchema>

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>
export type CreateEmailTemplate = z.infer<typeof CreateEmailTemplateSchema>
export type UpdateEmailTemplate = z.infer<typeof UpdateEmailTemplateSchema>

export type WhatsAppTemplate = z.infer<typeof WhatsAppTemplateSchema>
export type CreateWhatsAppTemplate = z.infer<typeof CreateWhatsAppTemplateSchema>
export type UpdateWhatsAppTemplate = z.infer<typeof UpdateWhatsAppTemplateSchema>

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>
export type CreateNotificationPreference = z.infer<typeof CreateNotificationPreferenceSchema>
export type UpdateNotificationPreference = z.infer<typeof UpdateNotificationPreferenceSchema>

export type Notification = z.infer<typeof NotificationSchema>
export type CreateNotification = z.infer<typeof CreateNotificationSchema>
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>

export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>
export type EmailSettings = z.infer<typeof EmailSettingsSchema>
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>

export type SettingsFilters = z.infer<typeof SettingsFiltersSchema>
export type EmailTemplateFilters = z.infer<typeof EmailTemplateFiltersSchema>
export type NotificationFilters = z.infer<typeof NotificationFiltersSchema>

export type BulkUpdateSettings = z.infer<typeof BulkUpdateSettingsSchema>
export type BulkDelete = z.infer<typeof BulkDeleteSchema>
