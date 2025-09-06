"use client"

import { useState } from "react"
import { User, Mail, Phone, MapPin, Calendar, Camera, Save, X } from "lucide-react"
import Image from "next/image"

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  location?: string
  birthDate?: string
  bio?: string
  avatar?: string
  interests: string[]
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
}

interface ProfileFormProps {
  profile: UserProfile
  onSave: (profile: UserProfile) => void
  loading?: boolean
}

export default function ProfileForm({ profile, onSave, loading = false }: ProfileFormProps) {
  const [formData, setFormData] = useState<UserProfile>(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNotificationChange = (field: keyof UserProfile['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }))
  }

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(profile)
    setIsEditing(false)
  }

  const availableInterests = [
    'Tarô', 'Astrologia', 'Numerologia', 'Cristais', 'Meditação',
    'Rituais', 'Herbalismo', 'Runas', 'Chakras', 'Feng Shui'
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index}>
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Informações Pessoais</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              {formData.avatar ? (
                <Image
                  src={formData.avatar}
                  alt={formData.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            {isEditing && (
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{formData.name}</h3>
            <p className="text-gray-600">{formData.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Localização */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Localização
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!isEditing}
                placeholder="Cidade, Estado"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Data de Nascimento */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento
            </label>
            <div className="relative max-w-xs">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.birthDate || ''}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sobre mim
          </label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            disabled={!isEditing}
            rows={4}
            placeholder="Conte um pouco sobre você e seus interesses..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
          />
        </div>

        {/* Interesses */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Áreas de Interesse
          </label>
          <div className="flex flex-wrap gap-2">
            {availableInterests.map((interest) => {
              const isSelected = formData.interests.includes(interest)
              return (
                <button
                  key={interest}
                  onClick={() => isEditing && handleInterestToggle(interest)}
                  disabled={!isEditing}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {interest}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notificações */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferências de Notificação</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Notificações por Email</h4>
                <p className="text-sm text-gray-600">Receba atualizações sobre cursos e atividades</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Notificações Push</h4>
                <p className="text-sm text-gray-600">Receba lembretes e atualizações em tempo real</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.push}
                  onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Marketing</h4>
                <p className="text-sm text-gray-600">Receba ofertas especiais e novidades</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.marketing}
                  onChange={(e) => handleNotificationChange('marketing', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}