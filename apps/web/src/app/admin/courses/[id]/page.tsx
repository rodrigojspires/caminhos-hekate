'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Trash2, Users, BarChart3, ExternalLink } from 'lucide-react'
import { CourseForm, type CourseFormValues } from '@/components/admin/CourseForm'
import { CourseContentManager } from '@/components/admin/CourseContentManager'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { CourseStatus, CourseLevel, SubscriptionTier } from '@hekate/database'

interface Course extends CourseFormValues {
  id: string
  createdAt: string
  updatedAt: string
  _count: {
    enrollments: number
    modules?: number
  }
  category?: {
    id: string
    name: string
    slug: string
  } | null
}

interface CourseEditPageProps {
  params: {
    id: string
  }
}

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

export default function CourseEditPage({ params }: CourseEditPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState<CourseFormValues | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/admin/courses/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || 'Erro ao carregar curso')
          router.push('/admin/courses')
          return
        }

        const rawAccessModels = Array.isArray(data.accessModels)
          ? data.accessModels
          : data.accessModel
            ? [data.accessModel]
            : []

        const validAccessModels = Array.from(
          new Set(
            rawAccessModels.filter((value): value is CourseFormValues['accessModels'][number] =>
              value === 'FREE' || value === 'ONE_TIME' || value === 'SUBSCRIPTION'
            )
          )
        )

        const normalizedAccessModels = (validAccessModels.length > 0
          ? validAccessModels
          : ['ONE_TIME']) as CourseFormValues['accessModels']

        const retrievedTier = typeof data.tier === 'string' ? data.tier : SubscriptionTier.FREE
        const validTier: SubscriptionTier = ([
          SubscriptionTier.FREE,
          SubscriptionTier.INICIADO,
          SubscriptionTier.ADEPTO,
          SubscriptionTier.SACERDOCIO
        ] as const).includes(retrievedTier as SubscriptionTier)
          ? (retrievedTier as SubscriptionTier)
          : SubscriptionTier.FREE

        const hasSubscription = normalizedAccessModels.includes('SUBSCRIPTION')
        const normalizedTier = hasSubscription
          ? (validTier === SubscriptionTier.FREE ? SubscriptionTier.INICIADO : validTier)
          : SubscriptionTier.FREE

        const mappedFormData: CourseFormValues = {
          title: data.title ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          shortDescription: data.shortDescription ?? '',
          price: data.price ?? 0,
          comparePrice: data.comparePrice ?? null,
          accessModels: normalizedAccessModels,
          tier: normalizedTier,
          status: data.status ?? CourseStatus.DRAFT,
          level: data.level ?? CourseLevel.BEGINNER,
          featured: data.featured ?? false,
          featuredImage: data.featuredImage ?? null,
          introVideo: data.introVideo ?? null,
          duration: data.duration ?? null,
          maxStudents: data.maxStudents ?? null,
          tags: Array.isArray(data.tags) ? data.tags : [],
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
          categoryId: data.categoryId ?? null
        }

        setCourse(data)
        setFormData(mappedFormData)
      } catch (error) {
        toast.error('Erro ao carregar curso')
        router.push('/admin/courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [params.id, router])

  const handleFormChange = (data: Partial<CourseFormValues>) => {
    if (!formData) return

    setFormData(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }

      if (data.title && course && prev.slug === generateSlug(course.title)) {
        updated.slug = generateSlug(data.title)
      }

      return updated
    })
  }

  const validateForm = (): string[] => {
    if (!formData) return ['Dados do formulário não carregados']

    const errors: string[] = []

    if (!formData.title.trim()) {
      errors.push('Título é obrigatório')
    }

    if (!formData.slug.trim()) {
      errors.push('Slug é obrigatório')
    }

    if (!formData.accessModels || formData.accessModels.length === 0) {
      errors.push('Selecione ao menos um modelo de acesso')
    }

    const hasSubscription = formData.accessModels?.includes('SUBSCRIPTION') ?? false

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

  const handleSave = async () => {
    if (!formData) return

    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    try {
      setSaving(true)

      const hasSubscription = formData.accessModels.includes('SUBSCRIPTION')

      const payload = {
        ...formData,
        comparePrice: formData.comparePrice ?? null,
        accessModels: Array.from(new Set(formData.accessModels)),
        tier: hasSubscription ? formData.tier : SubscriptionTier.FREE,
        featuredImage: formData.featuredImage?.trim() || null,
        introVideo: formData.introVideo?.trim() || null,
        duration: formData.duration ?? null,
        maxStudents: formData.maxStudents ?? null,
        metaTitle: formData.metaTitle?.trim() || null,
        metaDescription: formData.metaDescription?.trim() || null,
        categoryId: (() => {
          if (!formData.categoryId) return null
          const normalized = formData.categoryId.trim()
          return normalized.length > 0 ? normalized : null
        })(),
        tags: formData.tags.map(tag => tag.trim()).filter(Boolean)
      }

      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Curso atualizado com sucesso')
        setCourse(data)
      } else {
        if (data.details) {
          data.details.forEach((error: any) => {
            toast.error(`${error.path.join('.')}: ${error.message}`)
          })
        } else {
          toast.error(data.error || 'Erro ao atualizar curso')
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar curso')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!course) return

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o curso "${course.title}"?\n\n` +
      `Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.`
    )

    if (!confirmed) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Curso excluído com sucesso')
        router.push('/admin/courses')
      } else {
        toast.error(data.error || 'Erro ao excluir curso')
      }
    } catch (error) {
      toast.error('Erro ao excluir curso')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!course || !formData) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-300">
        Curso não encontrado
      </div>
    )
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Editar Curso</h1>
            <p className="text-gray-600 dark:text-gray-400">{course.title}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => router.push(`/admin/courses/${params.id}/enrollments`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Users className="w-4 h-4" />
            Inscrições ({course._count.enrollments})
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Inscrições</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {course._count.enrollments}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</span>
              </div>
              <p className="text-lg font-semibold mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.status === CourseStatus.PUBLISHED
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                    : course.status === CourseStatus.DRAFT
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {course.status === CourseStatus.PUBLISHED
                    ? 'Publicado'
                    : course.status === CourseStatus.DRAFT
                      ? 'Rascunho'
                      : 'Arquivado'}
                </span>
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Preço</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                R$ {Number(course.price ?? 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Nível</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {course.level === CourseLevel.BEGINNER
                  ? 'Iniciante'
                  : course.level === CourseLevel.INTERMEDIATE
                    ? 'Intermediário'
                    : course.level === CourseLevel.ADVANCED
                      ? 'Avançado'
                      : 'Especialista'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <CourseForm
              data={formData}
              onChange={handleFormChange}
              loading={saving}
            />
          </div>

          <Card>
            <CardContent className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Informações do Curso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Criado em:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(course.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Última atualização:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(course.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <CourseContentManager courseId={course.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
