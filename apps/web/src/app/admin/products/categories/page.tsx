'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Plus, Search, FolderTree, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { CategoryForm } from '@/components/admin/CategoryForm'

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
  children?: Category[]
  _count?: {
    products: number
    children: number
  }
  createdAt: string
  updatedAt: string
}

interface CategoryStats {
  total: number
  rootCategories: number
  subcategories: number
  productsAssigned: number
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<CategoryStats>({
    total: 0,
    rootCategories: 0,
    subcategories: 0,
    productsAssigned: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/products/categories?include=parent,children,_count')
      if (!response.ok) throw new Error('Falha ao carregar categorias')
      
      const data = await response.json()
      setCategories(data.categories)
      
      // Calculate stats
      const total = data.categories.length
      const rootCategories = data.categories.filter((cat: Category) => !cat.parentId).length
      const subcategories = total - rootCategories
      const productsAssigned = data.categories.reduce((sum: number, cat: Category) => 
        sum + (cat._count?.products || 0), 0
      )
      
      setStats({ total, rootCategories, subcategories, productsAssigned })
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (categoryData: any) => {
    try {
      const response = await fetch('/api/admin/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar categoria')
      }
      
      toast.success('Categoria criada com sucesso!')
      setShowCreateDialog(false)
      loadCategories()
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error)
      toast.error(error.message || 'Erro ao criar categoria')
    }
  }

  const handleUpdateCategory = async (categoryData: any) => {
    if (!selectedCategory) return
    
    try {
      const response = await fetch(`/api/admin/products/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar categoria')
      }
      
      toast.success('Categoria atualizada com sucesso!')
      setShowEditDialog(false)
      setSelectedCategory(null)
      loadCategories()
    } catch (error: any) {
      console.error('Erro ao atualizar categoria:', error)
      toast.error(error.message || 'Erro ao atualizar categoria')
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    
    try {
      const response = await fetch(`/api/admin/products/categories/${selectedCategory.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao excluir categoria')
      }
      
      toast.success('Categoria excluída com sucesso!')
      setShowDeleteDialog(false)
      setSelectedCategory(null)
      loadCategories()
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error)
      toast.error(error.message || 'Erro ao excluir categoria')
    }
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const buildCategoryTree = (categories: Category[], parentId: string | null = null): Category[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: buildCategoryTree(categories, cat.id)
      }))
  }

  const renderCategoryRow = (category: Category, level: number = 0): React.ReactNode => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    
    return (
      <>
        <TableRow key={category.id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6 mr-2"
                  onClick={() => toggleExpanded(category.id)}
                >
                  {isExpanded ? '−' : '+'}
                </Button>
              )}
              <FolderTree className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{category.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <code className="text-sm bg-muted px-2 py-1 rounded">{category.slug}</code>
          </TableCell>
          <TableCell className="max-w-xs">
            <p className="text-sm text-muted-foreground truncate">
              {category.description || '—'}
            </p>
          </TableCell>
          <TableCell>
            {category.parent ? (
              <Badge variant="outline">{category.parent.name}</Badge>
            ) : (
              <Badge>Raiz</Badge>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{category._count?.products || 0}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory(category)
                  setShowEditDialog(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory(category)
                  setShowDeleteDialog(true)
                }}
                disabled={(category._count?.products || 0) > 0 || (category._count?.children || 0) > 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && category.children?.map(child => 
          renderCategoryRow(child, level + 1)
        )}
      </>
    )
  }

  const categoryTree = buildCategoryTree(filteredCategories)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando categorias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias dos seus produtos
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">categorias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principais</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rootCategories}</div>
            <p className="text-xs text-muted-foreground">categorias raiz</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcategorias</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subcategories}</div>
            <p className="text-xs text-muted-foreground">subcategorias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productsAssigned}</div>
            <p className="text-xs text-muted-foreground">produtos atribuídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria Pai</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryTree.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                categoryTree.map(category => renderCategoryRow(category))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus produtos.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleCreateCategory}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Atualize as informações da categoria.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              category={selectedCategory}
              onSubmit={handleUpdateCategory}
              onCancel={() => {
                setShowEditDialog(false)
                setSelectedCategory(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria &ldquo;{selectedCategory?.name}&rdquo;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedCategory(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}