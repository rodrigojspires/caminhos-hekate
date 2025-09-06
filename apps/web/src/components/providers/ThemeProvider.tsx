'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { UserPreferences } from '@/lib/theme'
import { useTheme } from '@/hooks/useTheme'

interface ThemeContextType {
  preferences: UserPreferences
  isLoading: boolean
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  applyTheme: (themeName: 'light' | 'dark' | 'highContrast') => Promise<void>
  generateCSS: () => string
  isDarkMode: boolean
  toggleDarkMode: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeHook = useTheme()

  // Aplicar tema inicial ao montar o componente
  useEffect(() => {
    // Aplicar classes CSS globais para acessibilidade
    const style = document.createElement('style')
    style.textContent = `
      .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      .high-contrast {
        filter: contrast(150%);
      }
      
      .large-text {
        font-size: 120% !important;
      }
      
      .large-text * {
        font-size: inherit !important;
      }
      
      /* Variáveis CSS para modo escuro */
      .dark {
        color-scheme: dark;
      }
      
      /* Transições suaves para mudanças de tema */
      :root {
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      :root:not(.reduce-motion) * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <ThemeContext.Provider value={themeHook}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext deve ser usado dentro de um ThemeProvider')
  }
  return context
}

export default ThemeProvider