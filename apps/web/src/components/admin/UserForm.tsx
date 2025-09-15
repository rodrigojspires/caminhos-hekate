"use client"

import { useState, useEffect } from 'react'
import { Save, User, Mail, Shield, Crown, Activity } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
}

interface UserFormData {
  name: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
}

interface UserFormProps {
  user?: User
  onSave: (data: UserFormData) => Promise<void>
  loading?: boolean
  isCreating?: boolean
}

export function UserForm({ user, onSave, loading = false, isCreating = false }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role as any) || 'VISITOR',
    subscriptionTier: (user?.subscriptionTier as any) || 'FREE'
  })
  
  const [errors, setErrors] = useState<Partial<UserFormData>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Atualizar form quando user mudar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role as any,
        subscriptionTier: user.subscriptionTier as any
      })
      setHasChanges(false)
    }
  }, [user])

  // Validação
  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Manipular mudanças no form
  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Submeter form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSave(formData)
      setHasChanges(false)
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Nome completo
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            errors.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
          } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
          placeholder="Digite o nome completo"
          disabled={loading}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Mail className="w-4 h-4 inline mr-2" />
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            errors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
          } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
          placeholder="Digite o email"
          disabled={loading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Shield className="w-4 h-4 inline mr-2" />
          Função
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="VISITOR">Visitante</option>
          <option value="MEMBER">Membro</option>
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      {/* Subscription Tier */}
      <div>
        <label htmlFor="subscriptionTier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Crown className="w-4 h-4 inline mr-2" />
          Assinatura
        </label>
        <select
          id="subscriptionTier"
          value={formData.subscriptionTier}
          onChange={(e) => handleChange('subscriptionTier', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="FREE">Gratuito</option>
          <option value="INICIADO">Iniciado</option>
          <option value="ADEPTO">Adepto</option>
          <option value="SACERDOCIO">Sacerdócio</option>
        </select>
      </div>

      {/* Botões */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {hasChanges && !isCreating && (
            <span className="text-amber-600">
              • Alterações não salvas
            </span>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || (!hasChanges && !isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isCreating ? 'Criar Usuário' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
