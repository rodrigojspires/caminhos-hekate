import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { z } from 'zod'

// Schemas de validação
export const ThemeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor primária deve ser um hex válido'),
  secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor secundária deve ser um hex válido'),
  background: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor de fundo deve ser um hex válido'),
  surface: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor de superfície deve ser um hex válido'),
  text: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor do texto deve ser um hex válido'),
  textSecondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor do texto secundário deve ser um hex válido'),
  border: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor da borda deve ser um hex válido'),
  success: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor de sucesso deve ser um hex válido'),
  warning: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor de aviso deve ser um hex válido'),
  error: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor de erro deve ser um hex válido')
})

export const TypographySchema = z.object({
  fontFamily: z.string().min(1, 'Família da fonte é obrigatória'),
  fontSize: z.enum(['small', 'medium', 'large', 'extra-large']),
  lineHeight: z.number().min(1).max(3)
})

export const SpacingSchema = z.object({
  density: z.enum(['compact', 'comfortable', 'spacious']),
  borderRadius: z.enum(['none', 'small', 'medium', 'large', 'full'])
})

export const LayoutSchema = z.object({
  sidebar: z.object({
    width: z.number().min(200).max(400),
    collapsed: z.boolean().optional()
  }).optional(),
  header: z.object({
    height: z.number().min(48).max(80),
    fixed: z.boolean().optional()
  }).optional(),
  maxWidth: z.enum(['sm', 'md', 'lg', 'xl', '2xl', 'full']).optional()
})

export const AccessibilitySchema = z.object({
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  largeText: z.boolean(),
  screenReader: z.boolean().optional()
})

export const UserPreferencesSchema = z.object({
  theme: z.object({
    colors: ThemeColorsSchema.optional(),
    typography: TypographySchema.optional(),
    spacing: SpacingSchema.optional(),
    mode: z.enum(['light', 'dark', 'auto']).optional()
  }).optional(),
  layout: LayoutSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  locale: z.string().optional(),
  timezone: z.string().optional()
})

export const CustomThemeSchema = z.object({
  name: z.string().min(1, 'Nome do tema é obrigatório').max(255),
  colors: ThemeColorsSchema,
  typography: TypographySchema.optional(),
  spacing: SpacingSchema.optional(),
  isPublic: z.boolean().optional()
})

// Tipos TypeScript
export type ThemeColors = z.infer<typeof ThemeColorsSchema>
export type Typography = z.infer<typeof TypographySchema>
export type Spacing = z.infer<typeof SpacingSchema>
export type Layout = z.infer<typeof LayoutSchema>
export type Accessibility = z.infer<typeof AccessibilitySchema>
export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type CustomTheme = z.infer<typeof CustomThemeSchema>
// Include DB metadata for themes fetched from Prisma
export type CustomThemeRecord = CustomTheme & {
  id: string
  userId?: string | null
  createdAt?: Date
  updatedAt?: Date
}

// Temas padrão
export const DEFAULT_THEMES = {
  light: {
    name: 'Tema Claro',
    colors: {
      primary: '#8B5CF6',
      secondary: '#06B6D4',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 'medium' as const,
      lineHeight: 1.5
    },
    spacing: {
      density: 'comfortable' as const,
      borderRadius: 'medium' as const
    }
  },
  dark: {
    name: 'Tema Escuro',
    colors: {
      primary: '#A78BFA',
      secondary: '#22D3EE',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 'medium' as const,
      lineHeight: 1.5
    },
    spacing: {
      density: 'comfortable' as const,
      borderRadius: 'medium' as const
    }
  },
  highContrast: {
    name: 'Alto Contraste',
    colors: {
      primary: '#000000',
      secondary: '#0066CC',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      textSecondary: '#333333',
      border: '#000000',
      success: '#006600',
      warning: '#CC6600',
      error: '#CC0000'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 'large' as const,
      lineHeight: 1.6
    },
    spacing: {
      density: 'spacious' as const,
      borderRadius: 'small' as const
    }
  }
}

export class ThemeService {
  private db: PrismaClient | null
  private redis: Redis | null

  constructor(db: PrismaClient | null = null, redis: Redis | null = null) {
    this.db = db
    this.redis = redis
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Se não há db/redis (cliente), retornar padrão
    if (!this.db || !this.redis) {
      return this.getDefaultPreferences()
    }

    const cacheKey = `preferences:${userId}`
    
    try {
      // Verificar cache
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Buscar do banco
      const preferences = await this.db.userPreferences.findUnique({
        where: { userId }
      })

      const result = preferences ? {
        theme: preferences.theme as any,
        layout: preferences.layout as any,
        accessibility: preferences.accessibility as any,
        locale: preferences.locale,
        timezone: preferences.timezone
      } : this.getDefaultPreferences()

      // Cache por 1 hora
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result))

      return result
    } catch (error) {
      console.error('Erro ao buscar preferências do usuário:', error)
      return this.getDefaultPreferences()
    }
  }

  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    // Se não há db/redis (cliente), retornar padrão com updates
    if (!this.db || !this.redis) {
      return { ...this.getDefaultPreferences(), ...updates }
    }

    try {
      // Validar updates
      const validatedUpdates = this.validatePreferences(updates)

      // Atualizar no banco
      const updated = await this.db.userPreferences.upsert({
        where: { userId },
        update: {
          theme: validatedUpdates.theme as any,
          layout: validatedUpdates.layout as any,
          accessibility: validatedUpdates.accessibility as any,
          locale: validatedUpdates.locale,
          timezone: validatedUpdates.timezone
        },
        create: {
          userId,
          ...this.getDefaultPreferences(),
          ...validatedUpdates,
          theme: validatedUpdates.theme as any,
          layout: validatedUpdates.layout as any,
          accessibility: validatedUpdates.accessibility as any
        }
      })

      // Invalidar cache
      await this.redis.del(`preferences:${userId}`)

      const result = {
        theme: updated.theme as any,
        layout: updated.layout as any,
        accessibility: updated.accessibility as any,
        locale: updated.locale,
        timezone: updated.timezone
      }

      return result
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error)
      throw new Error('Falha ao atualizar preferências')
    }
  }

  async getPublicThemes(): Promise<CustomThemeRecord[]> {
    // Se não há db/redis (cliente), retornar array vazio
    if (!this.db || !this.redis) {
      return []
    }

    const cacheKey = 'themes:public'
    
    try {
      // Verificar cache
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Buscar do banco
      const themes = await this.db.customTheme.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' }
      })

      const result = themes.map(theme => ({
        // Incluir id para facilitar consumo
        id: theme.id,
        name: theme.name,
        colors: theme.colors as ThemeColors,
        typography: theme.typography as Typography,
        spacing: theme.spacing as Spacing,
        isPublic: theme.isPublic,
        userId: theme.userId,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt
      }))

      // Cache por 30 minutos
      await this.redis.setex(cacheKey, 1800, JSON.stringify(result))

      return result
    } catch (error) {
      console.error('Erro ao buscar temas públicos:', error)
      return []
    }
  }

  async createCustomTheme(
    userId: string,
    theme: CustomTheme
  ): Promise<CustomTheme> {
    // Se não há db/redis (cliente), retornar o tema como está
    if (!this.db || !this.redis) {
      return theme
    }

    try {
      // Validar tema
      const validatedTheme = CustomThemeSchema.parse(theme)

      // Criar no banco
      const created = await this.db.customTheme.create({
        data: {
          userId,
          name: validatedTheme.name,
          colors: validatedTheme.colors,
          typography: validatedTheme.typography || {},
          spacing: validatedTheme.spacing || {},
          isPublic: validatedTheme.isPublic || false
        }
      })

      // Invalidar cache de temas públicos se necessário
      if (created.isPublic) {
        await this.redis.del('themes:public')
      }

      return {
        name: created.name,
        colors: created.colors as ThemeColors,
        typography: created.typography as Typography,
        spacing: created.spacing as Spacing,
        isPublic: created.isPublic
      }
    } catch (error) {
      console.error('Erro ao criar tema customizado:', error)
      throw new Error('Falha ao criar tema customizado')
    }
  }

  // Recupera um tema pelo ID com metadados necessários para validações de acesso
  async getThemeById(id: string): Promise<{
    id: string
    userId: string | null
    name: string
    colors: ThemeColors
    typography?: Typography
    spacing?: Spacing
    isPublic: boolean
    createdAt: Date
    updatedAt: Date
  } | null> {
    if (!this.db) return null

    try {
      const theme = await this.db.customTheme.findUnique({ where: { id } })
      if (!theme) return null

      return {
        id: theme.id,
        userId: theme.userId,
        name: theme.name,
        colors: theme.colors as ThemeColors,
        typography: theme.typography as Typography,
        spacing: theme.spacing as Spacing,
        isPublic: theme.isPublic,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt
      }
    } catch (error) {
      console.error('Erro ao buscar tema por ID:', error)
      return null
    }
  }

  // Atualiza campos do tema customizado
  async updateCustomTheme(
    id: string,
    updates: Partial<CustomTheme>
  ): Promise<{
    id: string
    userId: string | null
    name: string
    colors: ThemeColors
    typography?: Typography
    spacing?: Spacing
    isPublic: boolean
    createdAt: Date
    updatedAt: Date
  }> {
    if (!this.db) throw new Error('DB indisponível no cliente')

    // Validar somente campos permitidos
    const validated = CustomThemeSchema.partial().parse(updates)

    const updated = await this.db.customTheme.update({
      where: { id },
      data: {
        name: validated.name,
        colors: validated.colors,
        typography: validated.typography,
        spacing: validated.spacing,
        isPublic: validated.isPublic
      }
    })

    // Invalidar cache se o tema é público
    if (updated.isPublic && this.redis) {
      await this.redis.del('themes:public')
    }

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      colors: updated.colors as ThemeColors,
      typography: updated.typography as Typography,
      spacing: updated.spacing as Spacing,
      isPublic: updated.isPublic,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }

  // Exclui um tema customizado
  async deleteCustomTheme(id: string): Promise<void> {
    if (!this.db) return

    const deleted = await this.db.customTheme.delete({ where: { id } })

    // Invalidar cache se necessário
    if (deleted.isPublic && this.redis) {
      await this.redis.del('themes:public')
    }
  }

  generateCSSVariables(preferences: UserPreferences): string {
    const { theme, layout, accessibility } = preferences
    
    const colors = theme?.colors || DEFAULT_THEMES.light.colors
    const typography = theme?.typography || DEFAULT_THEMES.light.typography
    const spacing = theme?.spacing || DEFAULT_THEMES.light.spacing

    const variables = {
      // Cores
      '--color-primary': colors.primary,
      '--color-secondary': colors.secondary,
      '--color-background': colors.background,
      '--color-surface': colors.surface,
      '--color-text': colors.text,
      '--color-text-secondary': colors.textSecondary,
      '--color-border': colors.border,
      '--color-success': colors.success,
      '--color-warning': colors.warning,
      '--color-error': colors.error,
      
      // Tipografia
      '--font-family': typography.fontFamily,
      '--font-size-base': this.getFontSize(typography.fontSize),
      '--line-height-base': typography.lineHeight.toString(),
      
      // Espaçamento
      '--spacing-unit': this.getSpacingUnit(spacing.density),
      '--border-radius': this.getBorderRadius(spacing.borderRadius),
      
      // Layout
      '--sidebar-width': `${layout?.sidebar?.width || 280}px`,
      '--header-height': `${layout?.header?.height || 64}px`,
      
      // Acessibilidade
      '--motion-reduce': accessibility?.reduceMotion ? '1' : '0',
      '--contrast-high': accessibility?.highContrast ? '1' : '0',
      '--text-large': accessibility?.largeText ? '1' : '0'
    }

    return Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: {
        colors: DEFAULT_THEMES.light.colors,
        typography: DEFAULT_THEMES.light.typography,
        spacing: DEFAULT_THEMES.light.spacing,
        mode: 'light'
      },
      layout: {
        sidebar: { width: 280, collapsed: false },
        header: { height: 64, fixed: true },
        maxWidth: 'xl'
      },
      accessibility: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false
      },
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo'
    }
  }

  private validatePreferences(preferences: Partial<UserPreferences>): Partial<UserPreferences> {
    try {
      return UserPreferencesSchema.partial().parse(preferences)
    } catch (error) {
      console.error('Erro na validação de preferências:', error)
      return {}
    }
  }

  private getFontSize(size: Typography['fontSize']): string {
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px'
    }
    return sizes[size]
  }

  private getSpacingUnit(density: Spacing['density']): string {
    const units = {
      compact: '4px',
      comfortable: '8px',
      spacious: '12px'
    }
    return units[density]
  }

  private getBorderRadius(radius: Spacing['borderRadius']): string {
    const radii = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px',
      full: '9999px'
    }
    return radii[radius]
  }
}

// Instância singleton
let themeService: ThemeService | null = null

export function getThemeService(): ThemeService {
  if (!themeService) {
    // Verificar se está rodando no servidor
    if (typeof window === 'undefined') {
      const { PrismaClient } = require('@prisma/client')
      const { Redis } = require('ioredis')
      
      const db = new PrismaClient()
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
      
      themeService = new ThemeService(db, redis)
    } else {
      // No cliente, criar uma instância mock
      themeService = new ThemeService(null, null)
    }
  }
  
  return themeService
}

export default ThemeService