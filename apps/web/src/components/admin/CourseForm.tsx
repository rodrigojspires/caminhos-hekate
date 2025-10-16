'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { CourseStatus, CourseLevel } from '@hekate/database'
import { Upload, X, Plus, Loader2, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'

export interface CourseFormValues {
  title: string
  slug: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number | null
  status: CourseStatus
  level: CourseLevel
  featured: boolean
  featuredImage?: string | null
  introVideo?: string | null
  duration?: number | null
  maxStudents?: number | null
  tags: string[]
  metaTitle?: string | null
  metaDescription?: string | null
}

interface CourseFormProps {
  data: CourseFormValues
  onChange: (data: Partial<CourseFormValues>) => void
  loading?: boolean
}

const inputClasses =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
const sectionTitleClasses =
  'text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2'
const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300'
const helperTextClasses = 'text-xs text-gray-500 dark:text-gray-400'
const acceptedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const acceptedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB

const isValidImageUrl = (url: string) => {
  if (!url) return false
  const pattern = /\.(jpg|jpeg|png|gif|webp|avif)$/i
  if (url.startsWith('/')) {
    return pattern.test(url)
  }
  try {
    const parsed = new URL(url)
    return pattern.test(parsed.pathname)
  } catch {
    return false
  }
}

const isValidVideoUrl = (url: string) => {
  if (!url) return false
  const pattern = /\.(mp4|webm|ogg|mov|qt)$/i
  if (url.startsWith('/')) {
    return pattern.test(url)
  }
  try {
    const parsed = new URL(url)
    return pattern.test(parsed.pathname)
  } catch {
    return false
  }
}

const uploadFile = async (file: File, type: 'course-images' | 'course-videos') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    let message = 'Erro ao enviar arquivo'
    try {
      const error = await response.json()
      if (error?.message) {
        message = error.message
      }
    } catch {
      // silently ignore JSON parse errors
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.url as string
}

export function CourseForm({ data, onChange, loading = false }: CourseFormProps) {
  const [newTag, setNewTag] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(data.featuredImage || null)
  const [videoPreview, setVideoPreview] = useState<string | null>(data.introVideo || null)
  const [imageUploading, setImageUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setImagePreview(data.featuredImage || null)
  }, [data.featuredImage])

  useEffect(() => {
    setVideoPreview(data.introVideo || null)
  }, [data.introVideo])

  const handleFieldChange = <K extends keyof CourseFormValues>(field: K, value: CourseFormValues[K]) => {
    onChange({ [field]: value } as Pick<CourseFormValues, K>)
  }

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !data.tags.includes(trimmed)) {
      handleFieldChange('tags', [...data.tags, trimmed])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    handleFieldChange('tags', data.tags.filter(tag => tag !== tagToRemove))
  }

  const handleImageUrlChange = (url: string) => {
    const normalized = url.trim()
    handleFieldChange('featuredImage', normalized ? normalized : null)
    setImagePreview(normalized ? normalized : null)
  }

  const handleVideoUrlChange = (url: string) => {
    const normalized = url.trim()
    handleFieldChange('introVideo', normalized ? normalized : null)
    setVideoPreview(normalized ? normalized : null)
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!acceptedImageTypes.includes(file.type)) {
      toast.error('Selecione uma imagem nos formatos JPG, PNG ou WebP.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('A imagem deve ter no máximo 5MB.')
      return
    }

    const previousImage = data.featuredImage || null
    let objectUrl: string | null = null

    try {
      setImageUploading(true)
      objectUrl = URL.createObjectURL(file)
      setImagePreview(objectUrl)

      const uploadedUrl = await uploadFile(file, 'course-images')
      handleImageUrlChange(uploadedUrl)
      toast.success('Imagem enviada com sucesso!')
    } catch (error) {
      setImagePreview(previousImage)
      const message = error instanceof Error ? error.message : 'Erro ao enviar a imagem'
      toast.error(message)
    } finally {
      setImageUploading(false)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!acceptedVideoTypes.includes(file.type)) {
      toast.error('Selecione um vídeo nos formatos MP4, WEBM, OGG ou MOV.')
      return
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('O vídeo deve ter no máximo 200MB.')
      return
    }

    const previousVideo = data.introVideo || null
    let objectUrl: string | null = null

    try {
      setVideoUploading(true)
      objectUrl = URL.createObjectURL(file)
      setVideoPreview(objectUrl)

      const uploadedUrl = await uploadFile(file, 'course-videos')
      handleVideoUrlChange(uploadedUrl)
      toast.success('Vídeo enviado com sucesso!')
    } catch (error) {
      setVideoPreview(previousVideo)
      const message = error instanceof Error ? error.message : 'Erro ao enviar o vídeo'
      toast.error(message)
    } finally {
      setVideoUploading(false)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }

  const clearImage = () => {
    handleFieldChange('featuredImage', null)
    setImagePreview(null)
  }

  const clearVideo = () => {
    handleFieldChange('introVideo', null)
    setVideoPreview(null)
  }

  return (
    <div className="p-6 space-y-8 text-gray-900 dark:text-gray-100">
      {/* Informações Básicas */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Informações Básicas
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClasses}>
              Título do Curso *
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Ex: Curso Completo de React"
              className={inputClasses}
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Slug (URL) *
            </label>
            <input
              type="text"
              value={data.slug}
              onChange={(e) => handleFieldChange('slug', e.target.value)}
              placeholder="curso-completo-react"
              className={inputClasses}
              disabled={loading}
              required
            />
            <p className={helperTextClasses}>
              URL amigável para o curso (apenas letras, números e hífens)
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className={labelClasses}>
            Descrição Curta *
          </label>
          <textarea
            value={data.shortDescription}
            onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
            placeholder="Breve descrição que aparecerá nas listagens..."
            rows={2}
            className={inputClasses}
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className={labelClasses}>
            Descrição Completa *
          </label>
          <textarea
            value={data.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Descrição detalhada do curso, objetivos, conteúdo programático..."
            rows={6}
            className={inputClasses}
            disabled={loading}
            required
          />
        </div>
      </div>

      {/* Configurações do Curso */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Configurações
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className={labelClasses}>
              Status *
            </label>
            <select
              value={data.status}
              onChange={(e) => handleFieldChange('status', e.target.value as CourseStatus)}
              className={inputClasses}
              disabled={loading}
            >
              <option value={CourseStatus.DRAFT}>Rascunho</option>
              <option value={CourseStatus.PUBLISHED}>Publicado</option>
              <option value={CourseStatus.ARCHIVED}>Arquivado</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Nível *
            </label>
            <select
              value={data.level}
              onChange={(e) => handleFieldChange('level', e.target.value as CourseLevel)}
              className={inputClasses}
              disabled={loading}
            >
              <option value={CourseLevel.BEGINNER}>Iniciante</option>
              <option value={CourseLevel.INTERMEDIATE}>Intermediário</option>
              <option value={CourseLevel.ADVANCED}>Avançado</option>
              <option value={CourseLevel.EXPERT}>Especialista</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={data.featured}
                onChange={(e) => handleFieldChange('featured', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              Curso em Destaque
            </label>
            <p className={helperTextClasses}>
              Cursos em destaque aparecem primeiro nas listagens
            </p>
          </div>
        </div>
      </div>

      {/* Preços */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Preços
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClasses}>
              Preço (R$) *
            </label>
            <input
              type="number"
              value={Number.isFinite(data.price) ? data.price : 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                handleFieldChange('price', Number.isFinite(value) ? value : 0)
              }}
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClasses}
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Preço de Comparação (R$)
            </label>
            <input
              type="number"
              value={data.comparePrice ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  handleFieldChange('comparePrice', null)
                  return
                }
                const value = parseFloat(raw)
                handleFieldChange('comparePrice', Number.isFinite(value) ? value : null)
              }}
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClasses}
              disabled={loading}
            />
            <p className={helperTextClasses}>
              Informe o preço original para exibir desconto no curso
            </p>
          </div>
        </div>
      </div>

      {/* Mídia */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Mídia
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClasses}>
              Imagem de Capa
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={data.featuredImage ?? ''}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg ou /uploads/course-images/arquivo.jpg"
                className={inputClasses}
                disabled={loading || imageUploading}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || imageUploading}
              >
                {imageUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
                disabled={loading || imageUploading}
              />
            </div>
            <p className={helperTextClasses}>
              Recomendado: 1280x720px • Formatos JPG, PNG ou WEBP • Até 5MB
            </p>
            {imagePreview && isValidImageUrl(imagePreview) && (
              <div className="mt-3 space-y-2">
                <div className="relative w-48 h-28">
                  <Image
                    src={imagePreview}
                    alt="Preview da capa"
                    fill
                    className="rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                    sizes="192px"
                    onError={() => setImagePreview(null)}
                  />
                  {imageUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading || imageUploading}
                >
                  <X className="w-4 h-4" />
                  Remover imagem
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Vídeo de Apresentação
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={data.introVideo ?? ''}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                placeholder="https://exemplo.com/video.mp4 ou /uploads/course-videos/arquivo.mp4"
                className={inputClasses}
                disabled={loading || videoUploading}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || videoUploading}
              >
                {videoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <VideoIcon className="w-4 h-4" />
                )}
                Upload
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleVideoFileChange}
                disabled={loading || videoUploading}
              />
            </div>
            <p className={helperTextClasses}>
              Formatos MP4, WEBM, OGG ou MOV • Até 200MB • Utilize URL externa ou envie o arquivo
            </p>
            {videoPreview && isValidVideoUrl(videoPreview) && (
              <div className="mt-3 space-y-2">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-black"
                />
                <button
                  type="button"
                  onClick={clearVideo}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading || videoUploading}
                >
                  <X className="w-4 h-4" />
                  Remover vídeo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Configurações Avançadas
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClasses}>
              Duração (horas)
            </label>
            <input
              type="number"
              value={data.duration ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  handleFieldChange('duration', null)
                  return
                }
                const value = parseInt(raw, 10)
                handleFieldChange('duration', Number.isFinite(value) ? value : null)
              }}
              min="1"
              placeholder="Ex: 40"
              className={inputClasses}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Máximo de Estudantes
            </label>
            <input
              type="number"
              value={data.maxStudents ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  handleFieldChange('maxStudents', null)
                  return
                }
                const value = parseInt(raw, 10)
                handleFieldChange('maxStudents', Number.isFinite(value) ? value : null)
              }}
              min="1"
              placeholder="Ex: 100"
              className={inputClasses}
              disabled={loading}
            />
            <p className={helperTextClasses}>
              Deixe vazio para ilimitado
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-6">
        <h3 className={sectionTitleClasses}>
          Tags
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Digite uma tag e pressione Enter"
              className={inputClasses}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-200 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !newTag.trim()}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        <h3 className={sectionTitleClasses}>
          SEO (Otimização para Buscadores)
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className={labelClasses}>
              Título SEO
            </label>
            <input
              type="text"
              value={data.metaTitle ?? ''}
              onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
              placeholder="Título otimizado para SEO"
              maxLength={60}
              className={inputClasses}
              disabled={loading}
            />
            <p className={helperTextClasses}>
              {(data.metaTitle ?? '').length}/60 caracteres
            </p>
          </div>
          
          <div className="space-y-2">
            <label className={labelClasses}>
              Descrição SEO
            </label>
            <textarea
              value={data.metaDescription ?? ''}
              onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
              placeholder="Descrição otimizada para SEO"
              maxLength={160}
              rows={3}
              className={inputClasses}
              disabled={loading}
            />
            <p className={helperTextClasses}>
              {(data.metaDescription ?? '').length}/160 caracteres
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
