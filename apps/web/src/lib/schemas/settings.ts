import { z } from 'zod'

// Enum para tipos de configuração
export const SettingTypeEnum = z.enum(['GENERAL', 'SECURITY', 'EMAIL', 'PAYMENT', 'NOTIFICATION', 'STORAGE', 'API'])

// Schema base para configurações
export const BaseSettingSchema = z.object({
  key: z.string()
    .min(1, 'Chave é obrigatória')
    .max(100, 'Chave deve ter no máximo 100 caracteres')
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Chave deve conter apenas letras maiúsculas, números e underscore'),
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  value: z.string()
    .max(5000, 'Valor deve ter no máximo 5000 caracteres'),
  type: SettingTypeEnum,
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  isPublic: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// Schemas específicos por tipo de valor
export const BooleanSettingSchema = BaseSettingSchema.extend({
  value: z.string().refine(
    (val) => val === 'true' || val === 'false',
    'Valor deve ser "true" ou "false"'
  )
})

export const NumberSettingSchema = BaseSettingSchema.extend({
  value: z.string().refine(
    (val) => !isNaN(Number(val)),
    'Valor deve ser um número válido'
  ),
  minValue: z.number().optional(),
  maxValue: z.number().optional()
})

export const EmailSettingSchema = BaseSettingSchema.extend({
  value: z.string().email('Deve ser um email válido')
})

export const UrlSettingSchema = BaseSettingSchema.extend({
  value: z.string().url('Deve ser uma URL válida')
})

export const JsonSettingSchema = BaseSettingSchema.extend({
  value: z.string().refine(
    (val) => {
      try {
        JSON.parse(val)
        return true
      } catch {
        return false
      }
    },
    'Valor deve ser um JSON válido'
  )
})

// Schema para configurações de segurança
export const SecuritySettingSchema = BaseSettingSchema.extend({
  type: z.literal('SECURITY'),
  value: z.string().min(1, 'Configuração de segurança não pode estar vazia')
})

// Schema para configurações de email
export const EmailConfigSettingSchema = BaseSettingSchema.extend({
  type: z.literal('EMAIL'),
  value: z.union([
    z.string().email(),
    z.string().min(1)
  ])
})

// Schema para configurações de pagamento
export const PaymentSettingSchema = BaseSettingSchema.extend({
  type: z.literal('PAYMENT'),
  value: z.string().min(1, 'Configuração de pagamento não pode estar vazia'),
  isEncrypted: z.boolean().default(true)
})

// Schema principal para criação de configurações
export const CreateSettingSchema = z.discriminatedUnion('type', [
  BaseSettingSchema.extend({ type: z.literal('GENERAL') }),
  SecuritySettingSchema,
  EmailConfigSettingSchema,
  PaymentSettingSchema,
  BaseSettingSchema.extend({ type: z.literal('NOTIFICATION') }),
  BaseSettingSchema.extend({ type: z.literal('STORAGE') }),
  BaseSettingSchema.extend({ type: z.literal('API') })
])

// Schema para atualização de configurações
export const UpdateSettingSchema = z.object({
  value: z.string().max(5000, 'Valor deve ter no máximo 5000 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  isPublic: z.boolean().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// Schema para filtros de busca
export const SettingsFiltersSchema = z.object({
  type: SettingTypeEnum.optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['key', 'type', 'updatedAt', 'createdAt']).default('key'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Schema para atualização em lote
export const BulkUpdateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().max(5000),
      description: z.string().max(500).optional(),
      type: SettingTypeEnum.optional(),
      isPublic: z.boolean().optional()
    })
  ).min(1, 'Deve haver pelo menos uma configuração para atualizar')
})

// Schema para validação de configurações específicas
export const SettingValidationSchema = z.object({
  key: z.string(),
  value: z.string(),
  validationType: z.enum(['boolean', 'number', 'email', 'url', 'json', 'string'])
})

// Tipos TypeScript derivados dos schemas
export type SettingType = z.infer<typeof SettingTypeEnum>
export type BaseSetting = z.infer<typeof BaseSettingSchema>
export type CreateSetting = z.infer<typeof CreateSettingSchema>
export type UpdateSetting = z.infer<typeof UpdateSettingSchema>
export type SettingsFilters = z.infer<typeof SettingsFiltersSchema>
export type BulkUpdateSettings = z.infer<typeof BulkUpdateSettingsSchema>
export type SettingValidation = z.infer<typeof SettingValidationSchema>

// Validadores específicos
export const validateSettingValue = (key: string, value: string, type: SettingType): boolean => {
  try {
    switch (key) {
      case 'SMTP_PORT':
      case 'SESSION_TIMEOUT':
      case 'MAX_FILE_SIZE':
        return !isNaN(Number(value)) && Number(value) > 0
      
      case 'SMTP_HOST':
      case 'SMTP_USER':
        return EmailSettingSchema.parse({ key, value, type }).value === value
      
      case 'ENABLE_2FA':
      case 'ENABLE_EMAIL_VERIFICATION':
      case 'MAINTENANCE_MODE':
        return value === 'true' || value === 'false'
      
      case 'ALLOWED_DOMAINS':
      case 'WEBHOOK_ENDPOINTS':
        try {
          JSON.parse(value)
          return true
        } catch {
          return false
        }
      
      default:
        return value.length <= 5000
    }
  } catch {
    return false
  }
}

// Configurações padrão do sistema
export const DEFAULT_SETTINGS = {
  GENERAL: {
    SITE_NAME: 'Caminhos de Hekate',
    SITE_DESCRIPTION: 'Plataforma de cursos esotéricos',
    MAINTENANCE_MODE: 'false',
    TIMEZONE: 'America/Sao_Paulo'
  },
  SECURITY: {
    ENABLE_2FA: 'false',
    SESSION_TIMEOUT: '3600',
    MAX_LOGIN_ATTEMPTS: '5',
    PASSWORD_MIN_LENGTH: '8'
  },
  EMAIL: {
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_SECURE: 'true',
    FROM_EMAIL: 'noreply@caminhosdehekate.com.br'
  },
  PAYMENT: {
    STRIPE_PUBLISHABLE_KEY: '',
    MERCADOPAGO_PUBLIC_KEY: '',
    ENABLE_PIX: 'true',
    CURRENCY: 'BRL'
  }
} as const