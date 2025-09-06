'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CourseStatus, CourseLevel } from '@hekate/database'
import { Upload, X, Plus, Link as LinkIcon } from 'lucide-react'

interface CourseFormData {
  title: string
  slug: string
  description: string
  shortDescription: string
  price?: number
  status: CourseStatus
  level: CourseLevel
  featured: boolean
  featuredImage?: string
  introVideo?: string
  duration?: number
  maxStudents?: number
  tags: string[]
  metaTitle?: string
  metaDescription?: string
}

interface CourseFormProps {
  data: CourseFormData
  onChange: (data: Partial<CourseFormData>) => void
  loading?: boolean
}

export function CourseForm({ data, onChange, loading = false }: CourseFormProps) {
  const [newTag, setNewTag] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(data.featuredImage || null)

  // Atualizar campo
  const handleFieldChange = (field: keyof CourseFormData, value: any) => {
    onChange({ [field]: value })
  }

  // Adicionar tag
  const handleAddTag = () => {
    if (newTag.trim() && !data.tags.includes(newTag.trim())) {
      onChange({ tags: [...data.tags, newTag.trim()] })
      setNewTag('')
    }
  }

  // Remover tag
  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: data.tags.filter(tag => tag !== tagToRemove) })
  }

  // Atualizar URL da imagem
  const handleImageUrlChange = (url: string) => {
    onChange({ featuredImage: url })
    setImagePreview(url)
  }

  // Validar URL da imagem
  const isValidImageUrl = (url: string): boolean => {
    try {
      new URL(url)
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
    } catch {
      return false
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Informações Básicas */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Informações Básicas
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Título do Curso *
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Ex: Curso Completo de React"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Slug (URL) *
            </label>
            <input
              type="text"
              value={data.slug}
              onChange={(e) => handleFieldChange('slug', e.target.value)}
              placeholder="curso-completo-react"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500">
              URL amigável para o curso (apenas letras, números e hífens)
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Descrição Curta *
          </label>
          <textarea
            value={data.shortDescription}
            onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
            placeholder="Breve descrição que aparecerá nas listagens..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Descrição Completa *
          </label>
          <textarea
            value={data.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Descrição detalhada do curso, objetivos, conteúdo programático..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          />
        </div>
      </div>

      {/* Configurações do Curso */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Configurações
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status *
            </label>
            <select
              value={data.status}
              onChange={(e) => handleFieldChange('status', e.target.value as CourseStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value={CourseStatus.DRAFT}>Rascunho</option>
              <option value={CourseStatus.PUBLISHED}>Publicado</option>
              <option value={CourseStatus.ARCHIVED}>Arquivado</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Nível *
            </label>
            <select
              value={data.level}
              onChange={(e) => handleFieldChange('level', e.target.value as CourseLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value={CourseLevel.BEGINNER}>Iniciante</option>
              <option value={CourseLevel.INTERMEDIATE}>Intermediário</option>
              <option value={CourseLevel.ADVANCED}>Avançado</option>
              <option value={CourseLevel.EXPERT}>Especialista</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.featured}
                onChange={(e) => handleFieldChange('featured', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700">
                Curso em Destaque
              </span>
            </label>
            <p className="text-xs text-gray-500">
              Cursos em destaque aparecem primeiro nas listagens
            </p>
          </div>
        </div>
      </div>

      {/* Preços */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Preços
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Preço (R$) *
            </label>
            <input
              type="number"
              value={data.price}
              onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Preço de Comparação (R$)
            </label>
            <input
              type="number"
              value={0}
              onChange={() => {}}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 opacity-50"
              disabled={true}
            />
            <p className="text-xs text-gray-500">
              Preço original (riscado) para mostrar desconto
            </p>
          </div>
        </div>
      </div>

      {/* Mídia */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Mídia
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              URL da Imagem de Capa
            </label>
            <div className="flex gap-2">
              <input
              type="url"
              value={data.featuredImage || ''}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
              <button
                type="button"
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            {imagePreview && isValidImageUrl(imagePreview) && (
              <div className="mt-2">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={128}
                  height={80}
                  className="w-32 h-20 object-cover rounded-lg border border-gray-200"
                  onError={() => setImagePreview(null)}
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              URL do Vídeo de Apresentação
            </label>
            <div className="flex gap-2">
              <input
              type="url"
              value={data.introVideo || ''}
              onChange={(e) => handleFieldChange('introVideo', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
              <button
                type="button"
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Configurações Avançadas
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Duração (horas)
            </label>
            <input
              type="number"
              value={data.duration || ''}
              onChange={(e) => handleFieldChange('duration', e.target.value ? parseInt(e.target.value) : undefined)}
              min="1"
              placeholder="Ex: 40"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Máximo de Estudantes
            </label>
            <input
              type="number"
              value={data.maxStudents || ''}
              onChange={(e) => handleFieldChange('maxStudents', e.target.value ? parseInt(e.target.value) : undefined)}
              min="1"
              placeholder="Ex: 100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Deixe vazio para ilimitado
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Tags
        </h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Digite uma tag e pressione Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              disabled={loading || !newTag.trim()}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                    disabled={loading}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEO */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          SEO (Otimização para Buscadores)
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Título SEO
            </label>
            <input
              type="text"
              value={data.metaTitle || ''}
              onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
              placeholder="Título otimizado para SEO"
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              {(data.metaTitle || '').length}/60 caracteres
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Descrição SEO
            </label>
            <textarea
              value={data.metaDescription || ''}
              onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
              placeholder="Descrição otimizada para SEO"
              maxLength={160}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              {(data.metaDescription || '').length}/160 caracteres
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}