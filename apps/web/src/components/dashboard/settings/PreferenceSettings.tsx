"use client"

import { useState } from "react"
import { Palette, Globe, Clock, BookOpen, Target, Zap, Moon, Sun, Monitor, Volume2, VolumeX, CheckCircle } from "lucide-react"

interface UserPreference {
  id: string
  category: 'appearance' | 'language' | 'learning' | 'accessibility' | 'performance'
  key: string
  value: any
  type: 'select' | 'toggle' | 'range' | 'color' | 'time'
  options?: { value: any; label: string }[]
  min?: number
  max?: number
  step?: number
}

interface PreferenceSettingsProps {
  preferences: UserPreference[]
  onUpdatePreferences: (preferences: UserPreference[]) => Promise<void>
  loading?: boolean
}

export default function PreferenceSettings({
  preferences,
  onUpdatePreferences,
  loading = false
}: PreferenceSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState(preferences)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeCategory, setActiveCategory] = useState('appearance')

  const categories = [
    {
      id: 'appearance',
      title: 'Aparência',
      description: 'Personalize a interface e tema visual',
      icon: Palette,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      id: 'language',
      title: 'Idioma & Região',
      description: 'Configure idioma, fuso horário e formato de data',
      icon: Globe,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      id: 'learning',
      title: 'Aprendizado',
      description: 'Personalize sua experiência de aprendizado',
      icon: BookOpen,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    {
      id: 'accessibility',
      title: 'Acessibilidade',
      description: 'Opções para melhorar a acessibilidade',
      icon: Target,
      color: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Configurações de desempenho e recursos',
      icon: Zap,
      color: 'text-red-600 bg-red-50 border-red-200'
    }
  ]

  const preferenceLabels: Record<string, string> = {
    // Appearance
    'theme': 'Tema',
    'colorScheme': 'Esquema de Cores',
    'fontSize': 'Tamanho da Fonte',
    'compactMode': 'Modo Compacto',
    'animations': 'Animações',
    'sidebar': 'Barra Lateral',
    
    // Language
    'language': 'Idioma',
    'timezone': 'Fuso Horário',
    'dateFormat': 'Formato de Data',
    'timeFormat': 'Formato de Hora',
    'currency': 'Moeda',
    
    // Learning
    'studyReminders': 'Lembretes de Estudo',
    'autoplay': 'Reprodução Automática',
    'playbackSpeed': 'Velocidade de Reprodução',
    'subtitles': 'Legendas',
    'difficulty': 'Nível de Dificuldade',
    'studyGoal': 'Meta de Estudo Diária',
    
    // Accessibility
    'highContrast': 'Alto Contraste',
    'largeText': 'Texto Grande',
    'reduceMotion': 'Reduzir Movimento',
    'screenReader': 'Leitor de Tela',
    'keyboardNavigation': 'Navegação por Teclado',
    
    // Performance
    'autoSave': 'Salvamento Automático',
    'preloadContent': 'Pré-carregar Conteúdo',
    'imageQuality': 'Qualidade de Imagem',
    'cacheSize': 'Tamanho do Cache',
    'backgroundSync': 'Sincronização em Background'
  }

  const preferenceDescriptions: Record<string, string> = {
    // Appearance
    'theme': 'Escolha entre tema claro, escuro ou automático',
    'colorScheme': 'Personalize as cores da interface',
    'fontSize': 'Ajuste o tamanho do texto em toda a plataforma',
    'compactMode': 'Interface mais compacta com menos espaçamento',
    'animations': 'Ativar ou desativar animações da interface',
    'sidebar': 'Configuração da barra lateral',
    
    // Language
    'language': 'Idioma da interface e conteúdo',
    'timezone': 'Seu fuso horário local',
    'dateFormat': 'Como as datas são exibidas',
    'timeFormat': 'Formato de 12h ou 24h',
    'currency': 'Moeda para exibição de preços',
    
    // Learning
    'studyReminders': 'Receber lembretes para estudar',
    'autoplay': 'Reproduzir próximo vídeo automaticamente',
    'playbackSpeed': 'Velocidade padrão dos vídeos',
    'subtitles': 'Mostrar legendas por padrão',
    'difficulty': 'Nível de dificuldade preferido',
    'studyGoal': 'Quantos minutos estudar por dia',
    
    // Accessibility
    'highContrast': 'Aumentar contraste para melhor visibilidade',
    'largeText': 'Texto maior para melhor legibilidade',
    'reduceMotion': 'Reduzir animações e movimentos',
    'screenReader': 'Otimizações para leitores de tela',
    'keyboardNavigation': 'Melhorar navegação por teclado',
    
    // Performance
    'autoSave': 'Salvar progresso automaticamente',
    'preloadContent': 'Carregar conteúdo antecipadamente',
    'imageQuality': 'Qualidade das imagens carregadas',
    'cacheSize': 'Espaço usado para cache local',
    'backgroundSync': 'Sincronizar dados em segundo plano'
  }

  const updatePreference = (id: string, value: any) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.id === id ? { ...pref, value } : pref
      )
    )
  }

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      await onUpdatePreferences(localPreferences)
    } finally {
      setIsUpdating(false)
    }
  }

  const getPreferencesByCategory = (categoryId: string) => {
    return localPreferences.filter(pref => pref.category === categoryId)
  }

  const renderPreferenceControl = (preference: UserPreference) => {
    const { type, value, options, min, max, step } = preference

    switch (type) {
      case 'toggle':
        return (
          <button
            onClick={() => updatePreference(preference.id, !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updatePreference(preference.id, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-w-[120px]"
          >
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'range':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => updatePreference(preference.id, Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm text-gray-600 min-w-[40px] text-right">
              {value}{preference.key === 'studyGoal' ? 'min' : preference.key === 'fontSize' ? 'px' : ''}
            </span>
          </div>
        )

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value}
              onChange={(e) => updatePreference(preference.id, e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-mono">{value}</span>
          </div>
        )

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => updatePreference(preference.id, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updatePreference(preference.id, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-w-[120px]"
          />
        )
    }
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light': return Sun
      case 'dark': return Moon
      case 'auto': return Monitor
      default: return Sun
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-1/4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Preferências</h2>
            <p className="text-gray-600 mt-1">
              Personalize sua experiência na plataforma
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.title}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Preferences Content */}
      <div className="p-6">
        {categories.map(category => {
          if (activeCategory !== category.id) return null
          
          const Icon = category.icon
          const categoryPreferences = getPreferencesByCategory(category.id)
          
          return (
            <div key={category.id}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="space-y-6">
                {categoryPreferences.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma preferência disponível nesta categoria</p>
                  </div>
                ) : (
                  categoryPreferences.map(preference => {
                    const label = preferenceLabels[preference.key] || preference.key
                    const description = preferenceDescriptions[preference.key] || ''
                    
                    return (
                      <div key={preference.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{label}</h4>
                            {preference.key === 'theme' && (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const ThemeIcon = getThemeIcon(preference.value)
                                  return <ThemeIcon className="w-4 h-4 text-gray-500" />
                                })()}
                              </div>
                            )}
                          </div>
                          {description && (
                            <p className="text-sm text-gray-600">{description}</p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {renderPreferenceControl(preference)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Category-specific tips */}
              {category.id === 'appearance' && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Dica</h4>
                  <p className="text-sm text-blue-700">
                    O tema automático se adapta às configurações do seu sistema operacional, 
                    alternando entre claro e escuro conforme necessário.
                  </p>
                </div>
              )}

              {category.id === 'learning' && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🎯 Recomendação</h4>
                  <p className="text-sm text-green-700">
                    Definir uma meta de estudo diária ajuda a manter a consistência. 
                    Recomendamos começar com 30 minutos por dia.
                  </p>
                </div>
              )}

              {category.id === 'accessibility' && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">♿ Acessibilidade</h4>
                  <p className="text-sm text-orange-700">
                    Estas configurações ajudam a tornar a plataforma mais acessível. 
                    Ative as opções que melhor atendem às suas necessidades.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}