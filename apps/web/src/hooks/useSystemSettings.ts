'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface SystemSetting {
  id: string
  key: string
  value: string
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  category: 'GENERAL' | 'SECURITY' | 'EMAIL' | 'PAYMENT' | 'NOTIFICATION'
  description: string
  isRequired: boolean
  isPublic: boolean
}

interface SystemSettings {
  siteName: string
  siteUrl: string
  contactEmail: string
  supportEmail: string
  timezone: string
  language: string
  currency: string
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    // Valores padrão enquanto carrega
    siteName: 'Caminhos de Hekate',
    siteUrl: 'https://caminhosdehekate.com',
    contactEmail: 'contato@caminhosdehekate.com',
    supportEmail: 'suporte@caminhosdehekate.com',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    currency: 'BRL'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/settings?category=GENERAL&isPublic=true')
      
      if (!response.ok) {
        throw new Error('Falha ao buscar configurações')
      }

      const data = await response.json()
      
      // Converter array de configurações em objeto
      const settingsMap = data.settings.reduce((acc: any, setting: SystemSetting) => {
        // Converter valores baseado no tipo
        let value: any = setting.value
        if (setting.type === 'NUMBER') {
          value = parseFloat(setting.value)
        } else if (setting.type === 'BOOLEAN') {
          value = setting.value === 'true'
        } else if (setting.type === 'JSON') {
          try {
            value = JSON.parse(setting.value)
          } catch {
            value = setting.value
          }
        }
        
        acc[setting.key] = value
        return acc
      }, {})

      // Mesclar com valores padrão para garantir que todas as propriedades existam
      setSettings(prevSettings => ({
        ...prevSettings,
        ...settingsMap
      }))
      
      console.log('Configurações carregadas da API')
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao carregar configurações do sistema')
      // Manter valores padrão em caso de erro
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = () => {
    fetchSettings()
  }

  return {
    settings,
    isLoading,
    error,
    refreshSettings
  }
}

// Hook para gerar dados de exemplo dinâmicos para preview
export function usePreviewData(customVariables?: Record<string, any>) {
  const { settings } = useSystemSettings()
  
  const generateSampleData = () => {
    const baseData = {
      '{{user.name}}': 'João Silva',
      '{{user.email}}': 'joao@exemplo.com',
      '{{user.firstName}}': 'João',
      '{{user.lastName}}': 'Silva',
      '{{user.id}}': 'user_123456',
      '{{site.name}}': settings?.siteName || 'Caminhos de Hekate',
      '{{site.url}}': settings?.siteUrl || 'https://caminhosdehekate.com',
      '{{contact.email}}': settings?.contactEmail || 'contato@caminhosdehekate.com',
      '{{support.email}}': settings?.supportEmail || 'suporte@caminhosdehekate.com',
      '{{date}}': new Date().toLocaleDateString(settings?.language || 'pt-BR'),
      '{{time}}': new Date().toLocaleTimeString(settings?.language || 'pt-BR'),
      '{{year}}': new Date().getFullYear().toString(),
      '{{month}}': new Date().toLocaleDateString(settings?.language || 'pt-BR', { month: 'long' }),
      '{{verification.url}}': `${settings?.siteUrl || 'https://caminhosdehekate.com'}/verificar/abc123`,
      '{{verification.token}}': 'abc123def456',
      '{{reset.url}}': `${settings?.siteUrl || 'https://caminhosdehekate.com'}/redefinir/xyz789`,
      '{{reset.token}}': 'xyz789ghi012',
      '{{order.id}}': '#12345',
      '{{order.number}}': 'ORD-2024-001',
      '{{order.total}}': settings?.currency === 'BRL' ? 'R$ 299,90' : '$299.90',
      '{{order.date}}': new Date().toLocaleDateString(settings?.language || 'pt-BR'),
      '{{course.name}}': 'Curso de Tarot Avançado',
      '{{course.url}}': `${settings?.siteUrl || 'https://caminhosdehekate.com'}/cursos/tarot-avancado`,
      '{{course.price}}': settings?.currency === 'BRL' ? 'R$ 299,90' : '$299.90',
      '{{group.name}}': 'Círculo de Estudos Esotéricos',
      '{{group.url}}': `${settings?.siteUrl || 'https://caminhosdehekate.com'}/grupos/circulo-estudos`,
      '{{event.name}}': 'Workshop de Cristais',
      '{{event.date}}': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(settings?.language || 'pt-BR'),
      '{{event.url}}': `${settings?.siteUrl || 'https://caminhosdehekate.com'}/eventos/workshop-cristais`,
      '{{notification.title}}': 'Nova mensagem recebida',
      '{{notification.message}}': 'Você tem uma nova mensagem em seu painel.',
      '{{achievement.name}}': 'Primeiro Curso Concluído',
      '{{achievement.description}}': 'Parabéns por concluir seu primeiro curso!',
      '{{points.earned}}': '100',
      '{{points.total}}': '350'
    }

    // Mesclar com variáveis customizadas se fornecidas
    return customVariables ? { ...baseData, ...customVariables } : baseData
  }

  const getVariablesByCategory = (category: string) => {
    const allData = generateSampleData()
    const categoryMap: Record<string, string[]> = {
      user: Object.keys(allData).filter(key => key.includes('user.')),
      site: Object.keys(allData).filter(key => key.includes('site.') || key.includes('contact.') || key.includes('support.')),
      order: Object.keys(allData).filter(key => key.includes('order.')),
      course: Object.keys(allData).filter(key => key.includes('course.')),
      group: Object.keys(allData).filter(key => key.includes('group.')),
      event: Object.keys(allData).filter(key => key.includes('event.')),
      notification: Object.keys(allData).filter(key => key.includes('notification.')),
      achievement: Object.keys(allData).filter(key => key.includes('achievement.') || key.includes('points.')),
      auth: Object.keys(allData).filter(key => key.includes('verification.') || key.includes('reset.')),
      date: Object.keys(allData).filter(key => ['{{date}}', '{{time}}', '{{year}}', '{{month}}'].includes(key))
    }
    
    return categoryMap[category] || []
  }

  // Novo: todas as variáveis categorizadas para UI
  const getAllVariablesByCategory = () => {
    const allData = generateSampleData()
    const categories = ['user','site','order','course','group','event','notification','achievement','auth','date'] as const

    const toItems = (keys: string[]) => keys.map((key) => ({ key, label: key }))

    const map: Record<string, { key: string; label: string }[]> = {
      user: toItems(Object.keys(allData).filter(k => k.includes('user.'))),
      site: toItems(Object.keys(allData).filter(k => k.includes('site.') || k.includes('contact.') || k.includes('support.'))),
      order: toItems(Object.keys(allData).filter(k => k.includes('order.'))),
      course: toItems(Object.keys(allData).filter(k => k.includes('course.'))),
      group: toItems(Object.keys(allData).filter(k => k.includes('group.'))),
      event: toItems(Object.keys(allData).filter(k => k.includes('event.'))),
      notification: toItems(Object.keys(allData).filter(k => k.includes('notification.'))),
      achievement: toItems(Object.keys(allData).filter(k => k.includes('achievement.') || k.includes('points.'))),
      auth: toItems(Object.keys(allData).filter(k => k.includes('verification.') || k.includes('reset.'))),
      date: toItems(Object.keys(allData).filter(k => ['{{date}}', '{{time}}', '{{year}}', '{{month}}'].includes(k)))
    }

    return map
  }

  const sampleData = generateSampleData() as Record<string, any>

  return {
    sampleData,
    getVariablesByCategory,
    getAllVariablesByCategory,
    settings
  }
}