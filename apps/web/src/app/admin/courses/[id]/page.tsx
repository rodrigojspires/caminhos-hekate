'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Trash2, Users, BarChart3 } from 'lucide-react'
import { CourseForm } from '@/components/admin/CourseForm'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { CourseStatus, CourseLevel } from '@hekate/database'

interface CourseFormData {
  title: string
  slug: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number
  status: CourseStatus
  level: CourseLevel
  featured: boolean
  imageUrl?: string
  videoUrl?: string
  duration?: number
  maxStudents?: number
  tags: string[]
  seoTitle?: string
  seoDescription?: string
}

interface Course extends CourseFormData {
  id: string
  createdAt: string
  updatedAt: string
  _count: {
    enrollments: number
  }
}

interface CourseEditPageProps {
  params: {
    id: string
  }
}

export default function CourseEditPage({ params }: CourseEditPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState<CourseFormData | null>(null)

  // Carregar dados do curso
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/admin/courses/${params.id}`)
        const data = await response.json()

        if (response.ok) {
          setCourse(data)
          setFormData({
            title: data.title,
            slug: data.slug,
            description: data.description,
            shortDescription: data.shortDescription,
            price: data.price,
            comparePrice: data.comparePrice,
            status: data.status,
            level: data.level,
            featured: data.featured,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            duration: data.duration,
            maxStudents: data.maxStudents,
            tags: data.tags,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription
          })
        } else {
          toast.error(data.error || 'Erro ao carregar curso')
          router.push('/admin/courses')
        }
      } catch (error) {
        toast.error('Erro ao carregar curso')
        router.push('/admin/courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [params.id, router])

  // Gerar slug automaticamente baseado no título
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Atualizar dados do formulário
  const handleFormChange = (data: Partial<CourseFormData>) => {
    if (!formData) return
    
    setFormData(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      
      // Gerar slug automaticamente se o título mudou e slug é baseado no título anterior
      if (data.title && course && prev.slug === generateSlug(course.title)) {
        updated.slug = generateSlug(data.title)
      }
      
      return updated
    })
  }

  // Validar formulário
  const validateForm = (): string[] => {
    if (!formData) return ['Dados do formulário não carregados']
    
    const errors: string[] = []
    
    if (!formData.title.trim()) {
      errors.push('Título é obrigatório')
    }
    
    if (!formData.slug.trim()) {
      errors.push('Slug é obrigatório')
    }
    
    if (formData.price < 0) {
      errors.push('Preço deve ser maior ou igual a zero')
    }
    
    if (formData.comparePrice && formData.comparePrice <= formData.price) {
      errors.push('Preço de comparação deve ser maior que o preço atual')
    }
    
    if (formData.duration && formData.duration <= 0) {
      errors.push('Duração deve ser maior que zero')
    }
    
    if (formData.maxStudents && formData.maxStudents <= 0) {
      errors.push('Número máximo de estudantes deve ser maior que zero')
    }
    
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      errors.push('URL da imagem inválida')
    }
    
    if (formData.videoUrl && !isValidUrl(formData.videoUrl)) {
      errors.push('URL do vídeo inválida')
    }
    
    return errors
  }

  // Validar URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Salvar alterações
  const handleSave = async () => {
    if (!formData) return
    
    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Curso atualizado com sucesso')
        setCourse(data)
      } else {
        if (data.details) {
          // Erros de validação do Zod
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

  // Excluir curso
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
      <div className="text-center py-12">
        <p className="text-gray-500">Curso não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Curso</h1>
            <p className="text-gray-600">{course.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/admin/courses/${params.id}/enrollments`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Users className="w-4 h-4" />
            Inscrições ({course._count.enrollments})
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
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
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Inscrições</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {course._count.enrollments}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Status</span>
          </div>
          <p className="text-lg font-semibold mt-1">
            <span className={`px-2 py-1 rounded-full text-xs ${
              course.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
              course.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {course.status === 'PUBLISHED' ? 'Publicado' :
               course.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
            </span>
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Preço</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            R$ {course.price.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Nível</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {course.level === 'BEGINNER' ? 'Iniciante' :
             course.level === 'INTERMEDIATE' ? 'Intermediário' :
             course.level === 'ADVANCED' ? 'Avançado' : 'Especialista'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-lg border border-gray-200">
        <CourseForm
          data={formData}
          onChange={handleFormChange}
          loading={saving}
        />
      </div>

      {/* Informações do Curso */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Informações do Curso</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Criado em:</span>
            <span className="ml-2 text-gray-900">
              {new Date(course.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Última atualização:</span>
            <span className="ml-2 text-gray-900">
              {new Date(course.updatedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}