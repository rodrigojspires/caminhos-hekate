'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPreferences, ThemeService, getThemeService, DEFAULT_THEMES } from '@/lib/theme'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface ThemeContextType {
  preferences: UserPreferences
  isLoading: boolean
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  applyTheme: (themeName: keyof typeof DEFAULT_THEMES) => Promise<void>
  generateCSS: () => string
  isDarkMode: boolean
  toggleDarkMode: () => Promise<void>
}

export function useTheme(): ThemeContextType {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Valores padrão iniciais
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
  })
  const [isLoading, setIsLoading] = useState(true)
  const [themeService, setThemeService] = useState<ThemeService | null>(null)

  // Inicializar serviço de tema
  useEffect(() => {
    try {
      const service = getThemeService()
      setThemeService(service)
    } catch (error) {
      console.error('Erro ao inicializar ThemeService:', error)
    }
  }, [])

  // Gerar CSS das variáveis
  const generateCSS = useCallback(() => {
    if (!themeService) return ''
    return themeService.generateCSSVariables(preferences)
  }, [themeService, preferences])

  // Aplicar tema ao DOM
  const applyThemeToDOM = useCallback((prefs: UserPreferences) => {
    const root = document.documentElement

    // Importante: não gerenciar a classe 'dark' aqui para evitar conflito
    // com o next-themes. Mantemos apenas variáveis e classes de acessibilidade.

    // Aplicar variáveis CSS personalizadas
    const css = generateCSS()
    
    // Remover estilo anterior se existir
    const existingStyle = document.getElementById('theme-variables')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Adicionar novo estilo
    const style = document.createElement('style')
    style.id = 'theme-variables'
    style.textContent = css
    document.head.appendChild(style)

    // Aplicar classes de acessibilidade
    if (prefs.accessibility?.reduceMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    if (prefs.accessibility?.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    if (prefs.accessibility?.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }
  }, [generateCSS])

  // Carregar preferências do usuário (evitar loop incluindo apenas deps estáveis)
  useEffect(() => {
    if (!user?.id || !themeService) return

    let cancelled = false
    const loadPreferences = async () => {
      try {
        setIsLoading(true)
        const userPrefs = await themeService.getUserPreferences(user.id)
        if (cancelled) return
        setPreferences(userPrefs)
        // Aplicar tema ao DOM com prefs carregadas
        applyThemeToDOM(userPrefs)
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar preferências:', error)
          toast.error('Erro ao carregar configurações de tema')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPreferences()
    return () => { cancelled = true }
  }, [user?.id, themeService])

  // Atualizar preferências
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id || !themeService) {
      toast.error('Usuário não autenticado')
      return
    }

    try {
      const updatedPrefs = await themeService.updatePreferences(user.id, updates)
      setPreferences(updatedPrefs)
      
      // Aplicar mudanças ao DOM
      applyThemeToDOM(updatedPrefs)
      
      toast.success('Configurações atualizadas com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error)
      toast.error('Erro ao salvar configurações')
    }
  }, [user?.id, themeService, applyThemeToDOM])

  // Aplicar tema predefinido
  const applyTheme = useCallback(async (themeName: keyof typeof DEFAULT_THEMES) => {
    const theme = DEFAULT_THEMES[themeName]
    
    await updatePreferences({
      theme: {
        ...preferences.theme,
        colors: theme.colors,
        typography: theme.typography,
        spacing: theme.spacing,
        mode: themeName === 'dark' ? 'dark' : 'light'
      }
    })
  }, [preferences.theme, updatePreferences])

  // Alternar modo escuro
  const toggleDarkMode = useCallback(async () => {
    const newMode = preferences.theme?.mode === 'dark' ? 'light' : 'dark'
    const themeColors = newMode === 'dark' ? DEFAULT_THEMES.dark.colors : DEFAULT_THEMES.light.colors
    
    await updatePreferences({
      theme: {
        ...preferences.theme,
        mode: newMode,
        colors: themeColors
      }
    })
  }, [preferences.theme, updatePreferences])

  // Detectar modo escuro
  const isDarkMode = preferences.theme?.mode === 'dark'

  // Aplicar tema inicial baseado na preferência do sistema
  useEffect(() => {
    if (!user?.id && typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const systemTheme = prefersDark ? 'dark' : 'light'
      
      if (preferences.theme?.mode === 'auto') {
        const themeColors = systemTheme === 'dark' ? DEFAULT_THEMES.dark.colors : DEFAULT_THEMES.light.colors
        
        setPreferences(prev => ({
          ...prev,
          theme: {
            ...prev.theme,
            mode: systemTheme,
            colors: themeColors
          }
        }))
      }
    }
  }, [user?.id, preferences.theme?.mode])

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    if (typeof window === 'undefined' || preferences.theme?.mode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? 'dark' : 'light'
      const themeColors = systemTheme === 'dark' ? DEFAULT_THEMES.dark.colors : DEFAULT_THEMES.light.colors
      
      setPreferences(prev => ({
        ...prev,
        theme: {
          ...prev.theme,
          mode: systemTheme,
          colors: themeColors
        }
      }))
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [preferences.theme?.mode])

  return {
    preferences,
    isLoading,
    updatePreferences,
    applyTheme,
    generateCSS,
    isDarkMode,
    toggleDarkMode
  }
}

export default useTheme
