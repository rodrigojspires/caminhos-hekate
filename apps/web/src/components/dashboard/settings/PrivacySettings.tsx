"use client"

import { useState } from "react"
import { Eye, EyeOff, Shield, Users, Globe, Lock, UserCheck, Database, Download, Trash2, AlertTriangle, CheckCircle } from "lucide-react"

interface PrivacyOption {
  id: string
  title: string
  description: string
  enabled: boolean
  category: 'profile' | 'activity' | 'data' | 'communication'
  level: 'public' | 'friends' | 'private'
  icon: any
}

interface DataExportRequest {
  id: string
  type: 'profile' | 'activity' | 'courses' | 'certificates' | 'all'
  status: 'pending' | 'processing' | 'ready' | 'expired'
  requestedAt: string
  expiresAt?: string
  downloadUrl?: string
}

interface PrivacySettingsProps {
  privacyOptions: PrivacyOption[]
  dataExports: DataExportRequest[]
  onUpdatePrivacy: (options: PrivacyOption[]) => Promise<void>
  onRequestDataExport: (type: string) => Promise<void>
  onDownloadData: (exportId: string) => Promise<void>
  onDeleteAccount: () => Promise<void>
  loading?: boolean
}

export default function PrivacySettings({
  privacyOptions,
  dataExports,
  onUpdatePrivacy,
  onRequestDataExport,
  onDownloadData,
  onDeleteAccount,
  loading = false
}: PrivacySettingsProps) {
  const [localOptions, setLocalOptions] = useState(privacyOptions)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [activeTab, setActiveTab] = useState('privacy')

  const privacyCategories = [
    {
      id: 'profile',
      title: 'Perfil',
      description: 'Controle quem pode ver suas informações pessoais',
      icon: UserCheck
    },
    {
      id: 'activity',
      title: 'Atividade',
      description: 'Gerencie a visibilidade do seu progresso e atividades',
      icon: Eye
    },
    {
      id: 'data',
      title: 'Dados',
      description: 'Configure como seus dados são coletados e usados',
      icon: Database
    },
    {
      id: 'communication',
      title: 'Comunicação',
      description: 'Controle como outros usuários podem entrar em contato',
      icon: Users
    }
  ]

  const visibilityLevels = [
    { value: 'public', label: 'Público', icon: Globe, description: 'Visível para todos' },
    { value: 'friends', label: 'Amigos', icon: Users, description: 'Apenas amigos podem ver' },
    { value: 'private', label: 'Privado', icon: Lock, description: 'Apenas você pode ver' }
  ]

  const exportTypes = [
    { id: 'profile', label: 'Dados do Perfil', description: 'Informações pessoais, configurações' },
    { id: 'activity', label: 'Histórico de Atividades', description: 'Progresso, acessos, interações' },
    { id: 'courses', label: 'Dados dos Cursos', description: 'Inscrições, progresso, notas' },
    { id: 'certificates', label: 'Certificados', description: 'Certificados obtidos e histórico' },
    { id: 'all', label: 'Todos os Dados', description: 'Exportação completa de todos os dados' }
  ]

  const updateOption = (id: string, updates: Partial<PrivacyOption>) => {
    setLocalOptions(prev => 
      prev.map(option => 
        option.id === id ? { ...option, ...updates } : option
      )
    )
  }

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      await onUpdatePrivacy(localOptions)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText === 'EXCLUIR CONTA') {
      await onDeleteAccount()
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ready': return 'text-green-600 bg-green-50 border-green-200'
      case 'expired': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            {[...Array(4)].map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-1/4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
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
            <h2 className="text-xl font-semibold text-gray-900">Configurações de Privacidade</h2>
            <p className="text-gray-600 mt-1">
              Gerencie sua privacidade e controle seus dados pessoais
            </p>
          </div>
          {activeTab === 'privacy' && (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'privacy', label: 'Privacidade', icon: Shield },
            { id: 'data', label: 'Meus Dados', icon: Database },
            { id: 'delete', label: 'Excluir Conta', icon: Trash2 }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Privacy Settings Tab */}
      {activeTab === 'privacy' && (
        <div className="p-6">
          <div className="space-y-8">
            {privacyCategories.map(category => {
              const Icon = category.icon
              const categoryOptions = localOptions.filter(option => option.category === category.id)
              
              return (
                <div key={category.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {categoryOptions.map(option => {
                      const OptionIcon = option.icon
                      return (
                        <div key={option.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <OptionIcon className="w-5 h-5 text-gray-500" />
                            <div>
                              <h4 className="font-medium text-gray-900">{option.title}</h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {visibilityLevels.map(level => {
                                const LevelIcon = level.icon
                                return (
                                  <button
                                    key={level.value}
                                    onClick={() => updateOption(option.id, { level: level.value as any })}
                                    className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                                      option.level === level.value
                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                    title={level.description}
                                  >
                                    <LevelIcon className="w-3 h-3" />
                                    {level.label}
                                  </button>
                                )
                              })}
                            </div>
                            
                            <button
                              onClick={() => updateOption(option.id, { enabled: !option.enabled })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                option.enabled ? 'bg-purple-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  option.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Data Export Tab */}
      {activeTab === 'data' && (
        <div className="p-6">
          <div className="space-y-8">
            {/* Export Requests */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Solicitar Exportação de Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {exportTypes.map(type => (
                  <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{type.label}</h4>
                      <button
                        onClick={() => onRequestDataExport(type.id)}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Download className="w-4 h-4 inline mr-1" />
                        Exportar
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export History */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Exportações</h3>
              {dataExports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma exportação solicitada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dataExports.map(exportRequest => (
                    <div key={exportRequest.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {exportTypes.find(t => t.id === exportRequest.type)?.label}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-lg border ${getStatusColor(exportRequest.status)}`}>
                            {exportRequest.status === 'pending' && 'Pendente'}
                            {exportRequest.status === 'processing' && 'Processando'}
                            {exportRequest.status === 'ready' && 'Pronto'}
                            {exportRequest.status === 'expired' && 'Expirado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Solicitado em {formatDate(exportRequest.requestedAt)}
                          {exportRequest.expiresAt && (
                            <span> • Expira em {formatDate(exportRequest.expiresAt)}</span>
                          )}
                        </p>
                      </div>
                      
                      {exportRequest.status === 'ready' && exportRequest.downloadUrl && (
                        <button
                          onClick={() => onDownloadData(exportRequest.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Tab */}
      {activeTab === 'delete' && (
        <div className="p-6">
          <div className="max-w-2xl">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-2">Excluir Conta Permanentemente</h3>
                  <p className="text-red-700 mb-4">
                    Esta ação é irreversível. Todos os seus dados, incluindo progresso dos cursos, 
                    certificados e histórico de atividades serão permanentemente removidos.
                  </p>
                  <ul className="text-sm text-red-600 space-y-1 mb-4">
                    <li>• Todos os cursos e progresso serão perdidos</li>
                    <li>• Certificados não poderão mais ser verificados</li>
                    <li>• Histórico de atividades será apagado</li>
                    <li>• Esta ação não pode ser desfeita</li>
                  </ul>
                </div>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Minha Conta
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para confirmar, digite &ldquo;EXCLUIR CONTA&rdquo; no campo abaixo:
                </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="EXCLUIR CONTA"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'EXCLUIR CONTA'}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}