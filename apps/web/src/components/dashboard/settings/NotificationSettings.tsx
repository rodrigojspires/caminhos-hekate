"use client"

import { useState } from "react"
import { Bell, Mail, Smartphone, Monitor, Volume2, VolumeX, Clock, Award, BookOpen, MessageSquare, Settings, CheckCircle } from "lucide-react"

interface NotificationPreference {
  id: string
  type: 'email' | 'push' | 'sms' | 'in_app'
  category: 'courses' | 'achievements' | 'reminders' | 'social' | 'system' | 'marketing'
  enabled: boolean
  frequency?: 'instant' | 'daily' | 'weekly' | 'never'
  quietHours?: {
    enabled: boolean
    start: string
    end: string
  }
}

interface NotificationSettingsProps {
  preferences: NotificationPreference[]
  onUpdatePreferences: (preferences: NotificationPreference[]) => Promise<void>
  loading?: boolean
}

export default function NotificationSettings({
  preferences,
  onUpdatePreferences,
  loading = false
}: NotificationSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState(preferences)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [globalSettings, setGlobalSettings] = useState({
    soundEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendNotifications: true
  })

  const notificationTypes = [
    { id: 'email', label: 'Email', icon: Mail, description: 'Receber notificações por email' },
    { id: 'push', label: 'Push', icon: Smartphone, description: 'Notificações push no navegador/app' },
    { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Mensagens de texto (premium)' },
    { id: 'in_app', label: 'No App', icon: Monitor, description: 'Notificações dentro da plataforma' }
  ]

  const categories = [
    { 
      id: 'courses', 
      label: 'Cursos', 
      icon: BookOpen, 
      description: 'Novos cursos, atualizações de conteúdo, prazos',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    { 
      id: 'achievements', 
      label: 'Conquistas', 
      icon: Award, 
      description: 'Certificados, badges, marcos de progresso',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    },
    { 
      id: 'reminders', 
      label: 'Lembretes', 
      icon: Clock, 
      description: 'Lembretes de estudo, prazos, metas',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    { 
      id: 'social', 
      label: 'Social', 
      icon: MessageSquare, 
      description: 'Comentários, menções, discussões',
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      id: 'system', 
      label: 'Sistema', 
      icon: Settings, 
      description: 'Atualizações de segurança, manutenção',
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    },
    { 
      id: 'marketing', 
      label: 'Marketing', 
      icon: Bell, 
      description: 'Promoções, novidades, newsletters',
      color: 'text-pink-600 bg-pink-50 border-pink-200'
    }
  ]

  const frequencyOptions = [
    { value: 'instant', label: 'Instantâneo' },
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'never', label: 'Nunca' }
  ]

  const updatePreference = (id: string, updates: Partial<NotificationPreference>) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.id === id ? { ...pref, ...updates } : pref
      )
    )
  }

  const toggleCategoryForType = (category: string, type: string, enabled: boolean) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.category === category && pref.type === type
          ? { ...pref, enabled }
          : pref
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

  const getPreferenceForCategoryAndType = (category: string, type: string) => {
    return localPreferences.find(p => p.category === category && p.type === type)
  }

  const filteredCategories = activeCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat.id === activeCategory)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-1/4"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
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
            <h2 className="text-xl font-semibold text-gray-900">Configurações de Notificação</h2>
            <p className="text-gray-600 mt-1">
              Personalize como e quando você quer receber notificações
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

      {/* Global Settings */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {globalSettings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm text-gray-700">Sons de notificação</span>
              </div>
              <button
                onClick={() => setGlobalSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  globalSettings.soundEnabled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    globalSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Horário silencioso</span>
              </div>
              <button
                onClick={() => setGlobalSettings(prev => ({ ...prev, quietHoursEnabled: !prev.quietHoursEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  globalSettings.quietHoursEnabled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    globalSettings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {globalSettings.quietHoursEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Início
                  </label>
                  <input
                    type="time"
                    value={globalSettings.quietHoursStart}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={globalSettings.quietHoursEnd}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              activeCategory === 'all'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                  activeCategory === category.id
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-6">
        <div className="space-y-6">
          {filteredCategories.map(category => {
            const Icon = category.icon
            return (
              <div key={category.id} className={`p-4 rounded-lg border ${category.color}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.label}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {notificationTypes.map(type => {
                    const TypeIcon = type.icon
                    const preference = getPreferenceForCategoryAndType(category.id, type.id)
                    const isEnabled = preference?.enabled || false
                    
                    return (
                      <div key={type.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">{type.label}</span>
                          </div>
                          <button
                            onClick={() => toggleCategoryForType(category.id, type.id, !isEnabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isEnabled ? 'bg-purple-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        {isEnabled && preference && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Frequência
                            </label>
                            <select
                              value={preference.frequency || 'instant'}
                              onChange={(e) => updatePreference(preference.id, { frequency: e.target.value as any })}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                            >
                              {frequencyOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Resumo das Configurações</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {notificationTypes.map(type => {
              const enabledCount = localPreferences.filter(p => p.type === type.id && p.enabled).length
              const TypeIcon = type.icon
              
              return (
                <div key={type.id} className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <TypeIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{type.label}</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{enabledCount}</span>
                  <span className="text-xs text-gray-500">ativas</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}