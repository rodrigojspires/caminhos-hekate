'use client'

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface User {
  id: string
  name: string
  email: string
  dateOfBirth?: string | null
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
}

interface UserFormData {
  name: string
  email: string
  dateOfBirth: string
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
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
    role: (user?.role as any) || 'VISITOR',
    subscriptionTier: (user?.subscriptionTier as any) || 'FREE'
  })
  
  const [errors, setErrors] = useState<Partial<UserFormData>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
        role: user.role as any,
        subscriptionTier: user.subscriptionTier as any
      })
      setHasChanges(false)
    }
  }, [user])

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {}
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await onSave(formData)
      setHasChanges(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Digite o nome completo"
            disabled={loading}
            className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : undefined}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Digite o email"
            disabled={loading}
            className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : undefined}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Função</Label>
          <Select value={formData.role} onValueChange={(value) => handleChange('role', value)} disabled={loading}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VISITOR">Visitante</SelectItem>
              <SelectItem value="MEMBER">Membro</SelectItem>
              <SelectItem value="EDITOR">Editor</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscriptionTier">Assinatura</Label>
          <Select value={formData.subscriptionTier} onValueChange={(value) => handleChange('subscriptionTier', value)} disabled={loading}>
            <SelectTrigger id="subscriptionTier">
              <SelectValue placeholder="Selecione a assinatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">Gratuito</SelectItem>
              <SelectItem value="INICIADO">Iniciado</SelectItem>
              <SelectItem value="ADEPTO">Adepto</SelectItem>
              <SelectItem value="SACERDOCIO">Sacerdócio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-hekate-gold/20">
        <div>
          {hasChanges && !isCreating && (
            <p className="text-sm text-amber-400">
              Você possui alterações não salvas.
            </p>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={loading || (!hasChanges && !isCreating)}
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isCreating ? 'Criar Usuário' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
