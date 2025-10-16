'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProductTable } from '@/components/admin/ProductTable'
import type { ProductTableProduct } from '@/components/admin/ProductTable'
import { ProductImportExport } from '@/components/admin/ProductImportExport'
import { toast } from 'sonner'

type AdminProduct = ProductTableProduct

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductsResponse {
  products: AdminProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  
  // Filtros
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Carregar produtos
  const loadProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      })
      
      if (search) params.append('search', search)
      if (categoryFilter) params.append('categoryId', categoryFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)
      
      const response = await fetch(`/api/admin/products?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }
      
      const data: ProductsResponse = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
      
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter, typeFilter, sortBy, sortOrder, pagination.limit])
  
  // Carregar categorias
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products/categories?limit=100')
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }, [])
  
  // Deletar produto
  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao deletar produto')
      }
      
      toast.success('Produto deletado com sucesso')
      loadProducts(pagination.page)
      
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error)
      toast.error(error.message || 'Erro ao deletar produto')
    }
  }
  
  // Duplicar produto
  const handleDuplicateProduct = async (productId: string) => {
    try {
      // Buscar produto original
      const response = await fetch(`/api/admin/products/${productId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar produto')
      }
      
      const { product } = await response.json()
      
      // Criar cópia
      const duplicateData = {
        ...product,
        name: `${product.name} (Cópia)`,
        slug: `${product.slug}-copy-${Date.now()}`,
        sku: product.sku ? `${product.sku}-copy` : null,
      }
      
      // Remover campos que não devem ser copiados
      delete duplicateData.id
      delete duplicateData.createdAt
      delete duplicateData.updatedAt
      delete duplicateData.category
      delete duplicateData._count
      delete duplicateData.variants
      delete duplicateData.orderItems
      
      const createResponse = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      })
      
      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Erro ao duplicar produto')
      }
      
      toast.success('Produto duplicado com sucesso')
      loadProducts(pagination.page)
      
    } catch (error: any) {
      console.error('Erro ao duplicar produto:', error)
      toast.error(error.message || 'Erro ao duplicar produto')
    }
  }
  
  // Aplicar filtros
  const applyFilters = () => {
    loadProducts(1)
  }
  
  // Limpar filtros
  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setStatusFilter('')
    setTypeFilter('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setTimeout(() => loadProducts(1), 100)
  }
  
  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== undefined) {
        loadProducts(1)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [search, loadProducts])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seus produtos, categorias e estoque
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/products/categories')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Categorias
          </Button>
          
          <ProductImportExport onImportComplete={() => loadProducts(pagination.page)} />
          
          <Button onClick={() => router.push('/admin/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>
      
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {products.filter((p) => p.active).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fora de Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {products.filter((p) => p.variants.every((v) => (v.stock ?? 0) <= 0)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos em Destaque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {products.filter(p => p.featured).length}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar produtos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter || 'ALL'} onValueChange={(v) => setCategoryFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter || 'ALL'} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Fora de Estoque</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter || 'ALL'} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="PHYSICAL">Físico</SelectItem>
                <SelectItem value="DIGITAL">Digital</SelectItem>
                <SelectItem value="SERVICE">Serviço</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Mais recentes</SelectItem>
                <SelectItem value="createdAt-asc">Mais antigos</SelectItem>
                <SelectItem value="name-asc">Nome A-Z</SelectItem>
                <SelectItem value="name-desc">Nome Z-A</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Aplicar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabela de Produtos */}
      <ProductTable
        products={products}
        loading={loading}
        pagination={pagination}
        onPageChange={loadProducts}
        onDeleteProduct={handleDeleteProduct}
        onDuplicateProduct={handleDuplicateProduct}
        onEditProduct={(id) => router.push(`/admin/products/${id}`)}
      />
    </div>
  )
}
