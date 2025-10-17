'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, ExternalLink } from 'lucide-react'
import { CourseForm, type CourseFormValues } from '@/components/admin/CourseForm'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { CourseStatus, CourseLevel, SubscriptionTier } from '@hekate/database'

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif)$/i
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|qt)$/i

const isValidUrlOrPath = (value?: string | null, extensionPattern?: RegExp) => {
  if (!value) return true
  const trimmed = value.trim()
  if (!trimmed) return true

  const validateExtension = (target: string) =>
    extensionPattern ? extensionPattern.test(target) : true

  if (trimmed.startsWith('/')) {
    const pathname = trimmed.split('?')[0]
    return validateExtension(pathname)
  }

  try {
    const parsed = new URL(trimmed)
    return validateExtension(parsed.pathname)
  } catch {
    return false
  }
}

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CourseFormValues>({
    title: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: 0,
    comparePrice: null,
    accessModels: ['ONE_TIME'],
    tier: SubscriptionTier.FREE,
    status: CourseStatus.DRAFT,
    level: CourseLevel.BEGINNER,
    featured: false,
    featuredImage: null,
    introVideo: null,
    duration: null,
    maxStudents: null,
    tags: [],
    metaTitle: null,
    metaDescription: null
  })

  const handleFormChange = (data: Partial<CourseFormValues>) => {
    setFormData(prev => {
      const updated = { ...prev, ...data }

      if (data.title && (!prev.slug || prev.slug === generateSlug(prev.title))) {
        updated.slug = generateSlug(data.title)
      }

      return updated
    })
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.title.trim()) {
      errors.push('Título é obrigatório')
    }

    if (!formData.slug.trim()) {
      errors.push('Slug é obrigatório')
    }

    if (formData.accessModels.length === 0) {
      errors.push('Selecione ao menos um modelo de acesso')
    }

    const hasSubscription = formData.accessModels.includes('SUBSCRIPTION')

    if (hasSubscription && formData.tier === SubscriptionTier.FREE) {
      errors.push('Escolha qual plano de assinatura inclui este curso')
    }

    if (!hasSubscription && formData.tier !== SubscriptionTier.FREE) {
      errors.push('Cursos fora da assinatura devem permanecer no plano FREE')
    }

    if (formData.price < 0) {
      errors.push('Preço deve ser maior ou igual a zero')
    }

    if (formData.comparePrice != null && formData.comparePrice <= formData.price) {
      errors.push('Preço de comparação deve ser maior que o preço atual')
    }

    if (formData.duration != null && formData.duration <= 0) {
      errors.push('Duração deve ser maior que zero')
    }

    if (formData.maxStudents != null && formData.maxStudents <= 0) {
      errors.push('Número máximo de estudantes deve ser maior que zero')
    }

    if (!isValidUrlOrPath(formData.featuredImage, IMAGE_EXTENSIONS)) {
      errors.push('Imagem de capa inválida')
    }

    if (!isValidUrlOrPath(formData.introVideo, VIDEO_EXTENSIONS)) {
      errors.push('Vídeo de apresentação inválido')
    }

    return errors
  }

  const handleSave = async (asDraft = false) => {
    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    try {
      setLoading(true)
      
      const hasSubscription = formData.accessModels.includes('SUBSCRIPTION')

      const courseData = {
        ...formData,
        status: asDraft ? CourseStatus.DRAFT : formData.status,
        comparePrice: formData.comparePrice ?? null,
        accessModels: formData.accessModels,
        tier: hasSubscription ? formData.tier : SubscriptionTier.FREE,
        featuredImage: formData.featuredImage?.trim() || null,
        introVideo: formData.introVideo?.trim() || null,
        duration: formData.duration ?? null,
        maxStudents: formData.maxStudents ?? null,
        metaTitle: formData.metaTitle?.trim() || null,
        metaDescription: formData.metaDescription?.trim() || null,
        tags: formData.tags.map(tag => tag.trim()).filter(Boolean)
      }

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          asDraft
            ? 'Curso salvo como rascunho com sucesso'
            : 'Curso criado com sucesso'
        )
        router.push('/admin/courses')
      } else {
        if (data.details) {
          data.details.forEach((error: any) => {
            toast.error(`${error.path.join('.')}: ${error.message}`)
          })
        } else {
          toast.error(data.error || 'Erro ao criar curso')
        }
      }
    } catch (error) {
      toast.error('Erro ao criar curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Novo Curso</h1>
            <p className="text-gray-600 dark:text-gray-400">Crie um novo curso para a plataforma</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {formData.slug.trim() && (
            <a
              href={`/cursos/${formData.slug.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-200 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver curso
            </a>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Rascunho
          </button>
          
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Criar Curso
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <CourseForm
          data={formData}
          onChange={handleFormChange}
          loading={loading}
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Dicas para criar um curso</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <li>• Use um título claro e descritivo que explique o que o aluno aprenderá</li>
          <li>• A descrição curta aparecerá nas listagens, mantenha-a concisa e atrativa</li>
          <li>• Tags ajudam na busca e categorização do curso</li>
          <li>• Defina um preço competitivo baseado no valor oferecido</li>
          <li>• Cursos em rascunho não ficam visíveis para os alunos</li>
        </ul>
      </div>
    </div>
  )
}
