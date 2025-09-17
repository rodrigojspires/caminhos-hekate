'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trash2, Copy, ExternalLink } from 'lucide-react'
import { ProductForm } from '@/components/admin/ProductForm'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import VariantDigitalSettings from '@/components/admin/VariantDigitalSettings'
import ProductVariantsEditor from '@/components/admin/ProductVariantsEditor'

interface Product {
  id: string
  name: string
  description?: string
  shortDescription?: string
  sku: string
  price: number
  compareAtPrice?: number
  costPrice?: number
  trackQuantity: boolean
  quantity?: number
  allowBackorder: boolean
  weight?: number
  dimensions?: string
  categoryId?: string
  type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  featured: boolean
  seoTitle?: string
  seoDescription?: string
  tags?: string
  images?: string[]
  createdAt: string
  updatedAt: string
  category?: {
    id: string
    name: string
    slug: string
  }
}

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/products/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Produto não encontrado')
          router.push('/admin/products')
          return
        }
        throw new Error('Erro ao carregar produto')
      }

      const data = await response.json()
      // API retorna { product }
      setProduct(data.product || data)
    } catch (error) {
      console.error('Erro ao carregar produto:', error)
      toast.error('Erro ao carregar produto')
      router.push('/admin/products')
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  const handleSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      // Atualiza dados do produto (SKU é tratado na variação principal em seguida)
      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      const text = await response.text()
      let json: any
      try {
        json = text ? JSON.parse(text) : {}
      } catch (e) {
        // Resposta não-JSON (ex.: HTML). Exibir trecho para depuração.
        throw new Error((text && text.slice(0, 200)) || 'Resposta inválida do servidor')
      }
      if (!response.ok) {
        throw new Error(json?.error || json?.message || 'Erro ao atualizar produto')
      }

      // Se houver SKU no formulário, aplicar na variação principal
      try {
        const mainVariantId = (product as any)?.variants?.[0]?.id
        if (data?.sku && mainVariantId) {
          const resVar = await fetch(`/api/admin/variants/${mainVariantId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: String(data.sku) })
          })
          if (!resVar.ok) {
            const t = await resVar.text();
            console.warn('Falha ao atualizar SKU da variação:', t)
          }
        }
      } catch (e) {
        console.warn('Erro ao aplicar SKU na variação principal:', e)
      }

      // Recarrega o produto atualizado
      try {
        const r = await fetch(`/api/admin/products/${params.id}`)
        const d = await r.json()
        setProduct(d.product || d)
      } catch {}
      toast.success('Produto atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar produto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao deletar produto')
      }

      toast.success('Produto deletado com sucesso!')
      router.push('/admin/products')
    } catch (error) {
      console.error('Erro ao deletar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar produto')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!product) return

    try {
      // Dados base do produto
      const main = (product as any).variants?.[0]
      const baseSlug = ((product as any).slug || product.name)
      const newSlug = `${baseSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')}-copy-${Date.now()}`

      const duplicateData: any = {
        name: `${product.name} (Cópia)`,
        slug: newSlug,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        // API aceita apenas PHYSICAL/DIGITAL
        type: (product.type === 'SERVICE' ? 'PHYSICAL' : product.type),
        categoryId: (product as any).categoryId || undefined,
        images: (product as any).images || [],
        featured: !!product.featured,
        // API de criação aceita ACTIVE/INACTIVE/OUT_OF_STOCK
        status: 'INACTIVE',
        // Variação padrão
        sku: `${(main?.sku || 'SKU')}-copy-${Date.now()}`,
        price: Number(main?.price ?? 0),
        comparePrice: main?.comparePrice != null ? Number(main.comparePrice) : undefined,
        quantity: main?.stock ?? 0,
        weight: main?.weight ?? undefined,
        height: (main?.dimensions as any)?.height ?? undefined,
        width: (main?.dimensions as any)?.width ?? undefined,
        length: (main?.dimensions as any)?.length ?? undefined,
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao duplicar produto')
      }

      const newProduct = await response.json()
      toast.success('Produto duplicado com sucesso!')
      router.push(`/admin/products/${newProduct.id}`)
    } catch (error) {
      console.error('Erro ao duplicar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao duplicar produto')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: 'secondary',
      ACTIVE: 'default',
      ARCHIVED: 'outline',
    } as const

    const labels = {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativo',
      ARCHIVED: 'Arquivado',
    }

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const labels = {
      PHYSICAL: 'Físico',
      DIGITAL: 'Digital',
      SERVICE: 'Serviço',
    }

    return (
      <Badge variant="outline">
        {labels[type as keyof typeof labels]}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Button onClick={() => router.push('/admin/products')}>Voltar para produtos</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* (wizard removido — variação padrão agora é criada na criação do produto) */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              {getStatusBadge(((product as any).active ? 'ACTIVE' : 'DRAFT') as string)}
              {getTypeBadge(product.type)}
              {product.featured && <Badge>Destaque</Badge>}
            </div>
            <p className="text-muted-foreground">
              SKU: {product.sku} • Criado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleDuplicate}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </Button>
            
            {(product as any).active && (
              <Button
                variant="outline"
                onClick={() => window.open(`/loja/${(product as any).slug}`, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver na Loja
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja deletar o produto &ldquo;{product.name}&rdquo;? 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deletando...' : 'Deletar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Informações Resumidas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumo do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Preço</p>
              {(() => {
                const main = (product as any).variants?.[0]
                const price = main?.price != null ? Number(main.price) : undefined
                const compare = main?.comparePrice != null ? Number(main.comparePrice) : undefined
                return (
                  <>
                    <p className="text-lg font-semibold">
                      {price != null ? `R$ ${price.toFixed(2)}` : '—'}
                    </p>
                    {compare != null && (
                      <p className="text-sm text-muted-foreground line-through">
                        R$ {compare.toFixed(2)}
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
            
            {product.trackQuantity && (
              <div>
                <p className="text-sm text-muted-foreground">Estoque</p>
                <p className="text-lg font-semibold">
                  {product.quantity || 0} unidades
                </p>
              </div>
            )}
            
            {product.category && (
              <div>
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="text-lg font-semibold">{product.category.name}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">Última Atualização</p>
              <p className="text-lg font-semibold">
                {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      {/* Formulário de Edição */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            initialData={product}
            onSubmit={handleSubmit}
            isLoading={isSaving}
            submitLabel="Atualizar Produto"
          />
        </CardContent>
      </Card>

      {/* Edição de Variações */}
      <ProductVariantsEditor productId={params.id} />

      {/* Configurações de Download por Variação (para produtos digitais) */}
      <VariantDigitalSettings productId={params.id} />
    </div>
  )
}
