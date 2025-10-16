'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDropzone } from 'react-dropzone'

export interface ProductFormData {
  name: string
  slug: string
  description: string
  shortDescription?: string
  sku: string
  price: number
  compareAtPrice?: number
  costPrice?: number
  trackQuantity: boolean
  quantity: number
  allowBackorder: boolean
  // Medidas para frete (variação padrão)
  weight?: number
  height?: number
  width?: number
  length?: number
  categoryId: string
  type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  active?: boolean
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
  isCreate?: boolean
}

export function ProductForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar Produto',
  isCreate = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    slug: (initialData as any)?.slug || '',
    description: initialData?.description || '',
    shortDescription: initialData?.shortDescription || '',
    sku: initialData?.sku || '',
    price: initialData?.price || 0,
    compareAtPrice: initialData?.compareAtPrice || undefined,
    costPrice: initialData?.costPrice || undefined,
    trackQuantity: initialData?.trackQuantity ?? true,
    quantity: initialData?.quantity || 0,
    allowBackorder: initialData?.allowBackorder ?? false,
    weight: (initialData as any)?.weight || undefined,
    height: (initialData as any)?.height || undefined,
    width: (initialData as any)?.width || undefined,
    length: (initialData as any)?.length || undefined,
    categoryId: initialData?.categoryId || (initialData as any)?.category?.id || '',
    type: initialData?.type || 'PHYSICAL',
    status: initialData?.status || 'DRAFT',
    active: (initialData as any)?.active ?? true,
    featured: initialData?.featured ?? false,
    seoTitle: initialData?.seoTitle || '',
    seoDescription: initialData?.seoDescription || '',
    tags: initialData?.tags || '',
    images: initialData?.images || [],
  })

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/products/categories?limit=100')
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data?.categories) ? data.categories : (data?.data || [])
          setCategories(items.map((c: any) => ({ id: c.id, name: c.name })))
        }
      } catch {}
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // util: compressão simples via canvas
  async function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
    const img = document.createElement('img')
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    img.src = dataUrl
    await new Promise(r => { img.onload = () => r(null) })
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const MAX_MB = 2
    const imgs: string[] = []
    for (const f of acceptedFiles) {
      if (f.size > MAX_MB * 1024 * 1024) {
        // compress
        const c = await compressImage(f)
        imgs.push(c)
      } else {
        const reader = new FileReader()
        const p = new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string) })
        reader.readAsDataURL(f)
        imgs.push(await p)
      }
    }
    const currentImages = Array.isArray(formData.images) ? formData.images : []
    handleInputChange('images', [...currentImages, ...imgs])
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })
  const imageList = Array.isArray(formData.images) ? formData.images : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Formulário de Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Destaque</label>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
              />
              <label className="text-sm font-medium">Ativo</label>
              <input
                type="checkbox"
                checked={!!formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
              />
            </div>
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
                <label className="block text-sm font-medium mb-2">Slug *</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="minha-url-amigavel"
                  required
                />
              </div>

              {isCreate && (
                <div>
                  <label className="block text-sm font-medium mb-2">SKU *</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Digite o SKU"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Categoria</label>
                <Select value={formData.categoryId || 'NONE'} onValueChange={(v) => handleInputChange('categoryId', v === 'NONE' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem categoria</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <Select value={formData.type} onValueChange={(v) => handleInputChange('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHYSICAL">Físico</SelectItem>
                    <SelectItem value="DIGITAL">Digital</SelectItem>
                  </SelectContent>
                </Select>
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

            {isCreate && (
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
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Imagens do Produto</label>
              <div {...getRootProps()} className={`border-dashed border rounded p-4 text-center ${isDragActive ? 'bg-muted' : ''}`}>
                <input {...getInputProps()} />
                <p className="text-sm text-muted-foreground">Arraste e solte imagens aqui ou clique para selecionar</p>
              </div>
              {imageList.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {imageList.map((src, i) => (
                    <div key={i} className="relative">
                      <Image
                        src={src}
                        alt={`Prévia ${i + 1}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 object-cover rounded"
                        unoptimized
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
                        onClick={() => {
                          const next = [...imageList]
                          next.splice(i, 1)
                          handleInputChange('images', next)
                        }}
                        aria-label="Remover imagem"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isCreate && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Peso (kg)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight ?? ''}
                    onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Altura (cm)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.height ?? ''}
                    onChange={(e) => handleInputChange('height', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Largura (cm)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.width ?? ''}
                    onChange={(e) => handleInputChange('width', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Comprimento (cm)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.length ?? ''}
                    onChange={(e) => handleInputChange('length', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.0"
                  />
                </div>
              </div>
            )}

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
