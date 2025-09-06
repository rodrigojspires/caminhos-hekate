'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ProductFormData {
  name: string
  description: string
  shortDescription?: string
  sku: string
  price: number
  compareAtPrice?: number
  costPrice?: number
  trackQuantity: boolean
  quantity: number
  allowBackorder: boolean
  weight?: number
  dimensions?: string
  categoryId: string
  type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  featured: boolean
  seoTitle?: string
  seoDescription?: string
  tags?: string
  images?: string[]
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function ProductForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar Produto'
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    shortDescription: initialData?.shortDescription || '',
    sku: initialData?.sku || '',
    price: initialData?.price || 0,
    compareAtPrice: initialData?.compareAtPrice || undefined,
    costPrice: initialData?.costPrice || undefined,
    trackQuantity: initialData?.trackQuantity ?? true,
    quantity: initialData?.quantity || 0,
    allowBackorder: initialData?.allowBackorder ?? false,
    weight: initialData?.weight || undefined,
    dimensions: initialData?.dimensions || '',
    categoryId: initialData?.categoryId || '',
    type: initialData?.type || 'PHYSICAL',
    status: initialData?.status || 'DRAFT',
    featured: initialData?.featured ?? false,
    seoTitle: initialData?.seoTitle || '',
    seoDescription: initialData?.seoDescription || '',
    tags: initialData?.tags || '',
    images: initialData?.images || [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Formulário de Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome do produto"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">SKU *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="Digite o SKU"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descrição Curta</label>
              <Textarea
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Breve descrição do produto"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descrição Completa</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição detalhada do produto"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Preço de Venda *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Preço Comparativo</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.compareAtPrice || ''}
                  onChange={(e) => handleInputChange('compareAtPrice', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Quantidade</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}