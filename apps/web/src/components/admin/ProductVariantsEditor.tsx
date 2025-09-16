'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

type Variant = {
  id: string
  name: string
  sku: string
  price: number
  comparePrice?: number | null
  stock: number
  active: boolean
  weight?: number | null
  dimensions?: { height?: number; width?: number; length?: number } | null
}

type Product = {
  id: string
  variants: Variant[]
}

export default function ProductVariantsEditor({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}`)
        const data = await res.json()
        setProduct(data.product || data)
      } catch (e) {
        toast.error('Falha ao carregar variações')
      }
    })()
  }, [productId])

  const updateLocal = (id: string, field: keyof Variant | 'height' | 'width' | 'length', value: any) => {
    setProduct(prev => {
      if (!prev) return prev
      const variants = prev.variants.map(v => {
        if (v.id !== id) return v
        if (field === 'height' || field === 'width' || field === 'length') {
          const d = v.dimensions || {}
          return { ...v, dimensions: { ...d, [field]: value } }
        }
        return { ...v, [field]: value } as Variant
      })
      return { ...prev, variants }
    })
  }

  const save = async (v: Variant) => {
    setSaving(s => ({ ...s, [v.id]: true }))
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: v.name,
          sku: v.sku,
          price: Number(v.price),
          comparePrice: v.comparePrice != null ? Number(v.comparePrice) : null,
          stock: Number(v.stock),
          active: !!v.active,
          weight: v.weight != null ? Number(v.weight) : null,
          dimensions: {
            height: v.dimensions?.height != null ? Number(v.dimensions.height) : undefined,
            width: v.dimensions?.width != null ? Number(v.dimensions.width) : undefined,
            length: v.dimensions?.length != null ? Number(v.dimensions.length) : undefined,
          },
        }),
      })
      if (!res.ok) throw new Error('Falha ao salvar variação')
      toast.success('Variação salva')
    } catch (e) {
      toast.error('Erro ao salvar variação')
    } finally {
      setSaving(s => ({ ...s, [v.id]: false }))
    }
  }

  if (!product) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Variações do Produto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {product.variants?.length ? product.variants.map(v => (
          <div key={v.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <Input value={v.name} onChange={e => updateLocal(v.id, 'name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">SKU</label>
              <Input value={v.sku} onChange={e => updateLocal(v.id, 'sku', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preço</label>
              <Input type="number" step="0.01" value={v.price ?? 0} onChange={e => updateLocal(v.id, 'price', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preço Comparativo</label>
              <Input type="number" step="0.01" value={v.comparePrice ?? ''} onChange={e => updateLocal(v.id, 'comparePrice', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Estoque</label>
              <Input type="number" value={v.stock ?? 0} onChange={e => updateLocal(v.id, 'stock', parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={v.active} onCheckedChange={(val) => updateLocal(v.id, 'active', val)} />
              <span className="text-sm">Ativo</span>
            </div>

            <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm mb-1">Peso (kg)</label>
                <Input type="number" step="0.01" value={v.weight ?? ''} onChange={e => updateLocal(v.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Altura (cm)</label>
                <Input type="number" step="0.1" value={v.dimensions?.height ?? ''} onChange={e => updateLocal(v.id, 'height', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Largura (cm)</label>
                <Input type="number" step="0.1" value={v.dimensions?.width ?? ''} onChange={e => updateLocal(v.id, 'width', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Comprimento (cm)</label>
                <Input type="number" step="0.1" value={v.dimensions?.length ?? ''} onChange={e => updateLocal(v.id, 'length', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
            </div>

            <div className="md:col-span-6 flex justify-end">
              <Button onClick={() => save(v)} disabled={!!saving[v.id]}>{saving[v.id] ? 'Salvando...' : 'Salvar variação'}</Button>
            </div>
          </div>
        )) : (
          <div className="text-muted-foreground">Nenhuma variação.</div>
        )}
      </CardContent>
    </Card>
  )
}

