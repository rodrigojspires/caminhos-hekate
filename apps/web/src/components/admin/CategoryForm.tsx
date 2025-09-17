'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  parent?: {
    id: string
    name: string
  }
}

interface CategoryFormProps {
  category?: Category
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
}

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      parentId: category?.parentId || null,
    },
  })

  const watchedName = watch('name')

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName && !category) {
      const slug = watchedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
      setValue('slug', slug)
    }
  }, [watchedName, setValue, category])

  // Check if a category is a descendant of another (declare before use)
  const isDescendant = useCallback((cat: Category, ancestorId: string, allCategories: Category[]): boolean => {
    if (cat.parentId === ancestorId) return true
    if (!cat.parentId) return false
    
    const parent = allCategories.find(c => c.id === cat.parentId)
    if (!parent) return false
    
    return isDescendant(parent, ancestorId, allCategories)
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/admin/products/categories')
      if (!response.ok) throw new Error('Falha ao carregar categorias')
      
      const data = await response.json()
      // Filter out current category and its descendants to prevent circular references
      const availableCategories = data.categories.filter((cat: Category) => {
        if (!category) return true
        return cat.id !== category.id && !isDescendant(cat, category.id, data.categories)
      })
      
      setCategories(availableCategories)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoadingCategories(false)
    }
  }, [category, isDescendant])

  // Load categories for parent selection
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const onSubmitForm = async (data: CategoryFormData) => {
    try {
      setLoading(true)
      await onSubmit(data)
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
    } finally {
      setLoading(false)
    }
  }

  // Build category tree for better visualization
  const buildCategoryOptions = (categories: Category[], parentId: string | null = null, level: number = 0): JSX.Element[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .reduce((acc: JSX.Element[], cat) => {
        const indent = '—'.repeat(level)
        acc.push(
          <SelectItem key={cat.id} value={cat.id}>
            {indent} {cat.name}
          </SelectItem>
        )
        acc.push(...buildCategoryOptions(categories, cat.id, level + 1))
        return acc
      }, [])
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nome da categoria"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="slug-da-categoria"
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente se não preenchido
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição da categoria (opcional)"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hierarquia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parentId">Categoria Pai</Label>
            {loadingCategories ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando categorias...</span>
              </div>
            ) : (
              <Select
                value={(watch('parentId') ?? 'NONE') as string}
                onValueChange={(value) => setValue('parentId', value === 'NONE' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria pai (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhuma (categoria raiz)</SelectItem>
                  {buildCategoryOptions(categories)}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Deixe em branco para criar uma categoria raiz
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {category ? 'Atualizar' : 'Criar'} Categoria
        </Button>
      </div>
    </form>
  )
}
