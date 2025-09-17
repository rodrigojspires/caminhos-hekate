'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { ProductForm } from '@/components/admin/ProductForm'
import { toast } from 'sonner'

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      // Mapear dados do formulário para o schema da API (variação padrão)
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription || undefined,
        type: data.type === 'SERVICE' ? 'PHYSICAL' : data.type,
        categoryId: data.categoryId || undefined,
        status: data.active ? 'ACTIVE' : 'INACTIVE',
        featured: !!data.featured,
        images: Array.isArray(data.images) ? data.images : [],
        seoTitle: data.seoTitle || undefined,
        seoDescription: data.seoDescription || undefined,
        tags: data.tags ? String(data.tags).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar produto')
      }

      const { product } = await response.json()
      toast.success('Produto criado com sucesso!')
      router.push(`/admin/products/${product.id}`)
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar produto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
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
            <h1 className="text-3xl font-bold tracking-tight">Novo Produto</h1>
            <p className="text-muted-foreground">
              Adicione um novo produto ao catálogo
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel="Criar Produto"
            isCreate
          />
        </CardContent>
      </Card>
    </div>
  )
}
