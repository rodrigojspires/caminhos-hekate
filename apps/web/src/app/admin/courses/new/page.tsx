'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
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

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: 0,
    comparePrice: undefined,
    status: CourseStatus.DRAFT,
    level: CourseLevel.BEGINNER,
    featured: false,
    imageUrl: undefined,
    videoUrl: undefined,
    duration: undefined,
    maxStudents: undefined,
    tags: [],
    seoTitle: undefined,
    seoDescription: undefined
  })

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
    setFormData(prev => {
      const updated = { ...prev, ...data }
      
      // Gerar slug automaticamente se o título mudou e slug está vazio ou é baseado no título anterior
      if (data.title && (!prev.slug || prev.slug === generateSlug(prev.title))) {
        updated.slug = generateSlug(data.title)
      }
      
      return updated
    })
  }

  // Validar formulário
  const validateForm = (): string[] => {
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

  // Salvar curso
  const handleSave = async (asDraft = false) => {
    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    try {
      setLoading(true)
      
      const courseData = {
        ...formData,
        status: asDraft ? CourseStatus.DRAFT : formData.status
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
          // Erros de validação do Zod
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
            <h1 className="text-2xl font-bold text-gray-900">Novo Curso</h1>
            <p className="text-gray-600">Crie um novo curso para a plataforma</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

      {/* Formulário */}
      <div className="bg-white rounded-lg border border-gray-200">
        <CourseForm
          data={formData}
          onChange={handleFormChange}
          loading={loading}
        />
      </div>

      {/* Informações de Ajuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Dicas para criar um curso</h3>
        <ul className="text-sm text-blue-700 space-y-1">
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