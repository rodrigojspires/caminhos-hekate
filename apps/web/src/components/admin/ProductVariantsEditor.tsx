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
  attributes?: Record<string, any> | null
}

type Product = {
  id: string
  variants: Variant[]
}

export default function ProductVariantsEditor({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [newVar, setNewVar] = useState<Partial<Variant & { dimensions?: { height?: number; width?: number; length?: number } }>>({ name: '', sku: '', price: 0, stock: 0, active: true })
  const [variantImages, setVariantImages] = useState<Record<string, string[]>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}`)
        const data = await res.json()
        setProduct(data.product || data)
        const map: Record<string, string[]> = {}
        for (const v of (data.product || data)?.variants || []) {
          const imgs = Array.isArray(v.attributes?.images) ? v.attributes.images : []
          if (imgs.length) map[v.id] = imgs
        }
        setVariantImages(map)
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
          attributes: {
            ...(v.attributes || {}),
            images: variantImages[v.id] || [],
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
        <div className="flex items-center justify-between">
          <CardTitle>Variações do Produto</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
            {adding ? 'Cancelar' : 'Adicionar variação'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {adding && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-3 border rounded">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <Input value={newVar.name || ''} onChange={e => setNewVar(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">SKU</label>
              <Input value={newVar.sku || ''} onChange={e => setNewVar(v => ({ ...v, sku: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preço</label>
              <Input type="number" step="0.01" value={newVar.price as any} onChange={e => setNewVar(v => ({ ...v, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preço Comparativo</label>
              <Input type="number" step="0.01" value={(newVar.comparePrice as any) ?? ''} onChange={e => setNewVar(v => ({ ...v, comparePrice: e.target.value ? parseFloat(e.target.value) : undefined }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Estoque</label>
              <Input type="number" value={(newVar.stock as any) ?? 0} onChange={e => setNewVar(v => ({ ...v, stock: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!newVar.active} onCheckedChange={(val) => setNewVar(v => ({ ...v, active: val }))} />
              <span className="text-sm">Ativo</span>
            </div>
            <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm mb-1">Peso (kg)</label>
                <Input type="number" step="0.01" value={(newVar.weight as any) ?? ''} onChange={e => setNewVar(v => ({ ...v, weight: e.target.value ? parseFloat(e.target.value) : undefined }))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Altura (cm)</label>
                <Input type="number" step="0.1" value={(newVar.dimensions?.height as any) ?? ''} onChange={e => setNewVar(v => ({ ...v, dimensions: { ...(v.dimensions || {}), height: e.target.value ? parseFloat(e.target.value) : undefined } }))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Largura (cm)</label>
                <Input type="number" step="0.1" value={(newVar.dimensions?.width as any) ?? ''} onChange={e => setNewVar(v => ({ ...v, dimensions: { ...(v.dimensions || {}), width: e.target.value ? parseFloat(e.target.value) : undefined } }))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Comprimento (cm)</label>
                <Input type="number" step="0.1" value={(newVar.dimensions?.length as any) ?? ''} onChange={e => setNewVar(v => ({ ...v, dimensions: { ...(v.dimensions || {}), length: e.target.value ? parseFloat(e.target.value) : undefined } }))} />
              </div>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/variants', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId,
                        sku: newVar.sku,
                        name: newVar.name,
                        price: Number(newVar.price || 0),
                        comparePrice: newVar.comparePrice != null ? Number(newVar.comparePrice) : null,
                        stock: Number(newVar.stock || 0),
                        active: !!newVar.active,
                        weight: newVar.weight != null ? Number(newVar.weight) : null,
                        dimensions: newVar.dimensions,
                      }),
                    })
                    if (!res.ok) throw new Error('Falha ao criar variação')
                    // reload product
                    const r2 = await fetch(`/api/admin/products/${productId}`)
                    const d2 = await r2.json()
                    setProduct(d2.product || d2)
                    setAdding(false)
                    setNewVar({ name: '', sku: '', price: 0, stock: 0, active: true })
                    toast.success('Variação criada')
                  } catch (e) {
                    toast.error('Erro ao criar variação')
                  }
                }}
              >Salvar variação</Button>
            </div>
          </div>
        )}

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

            {/* Imagens da variação */}
            <div className="md:col-span-6">
              <div className="text-sm font-medium mb-1">Imagens da variação</div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return
                  const readers = files.map(f => new Promise<string>((resolve) => {
                    const r = new FileReader()
                    r.onload = () => resolve(r.result as string)
                    r.readAsDataURL(f)
                  }))
                  Promise.all(readers).then((dataUrls) => {
                    setVariantImages(prev => ({ ...prev, [v.id]: dataUrls }))
                  })
                }}
              />
              {(variantImages[v.id]?.length ? variantImages[v.id] : (v.attributes?.images || [])).length > 0 && (
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {(variantImages[v.id] || (v.attributes?.images || [])).map((src: string, i: number) => (
                    <img key={i} src={src} alt={`var-${v.id}-${i}`} className="h-16 w-16 object-cover rounded" />
                  ))}
                </div>
              )}
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
