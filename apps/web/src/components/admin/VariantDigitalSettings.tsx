'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type Variant = {
  id: string
  name: string
  attributes?: Record<string, any> | null
  active: boolean
}

type Product = {
  id: string
  type: 'PHYSICAL' | 'DIGITAL'
  variants: Variant[]
}

export default function VariantDigitalSettings({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, { digitalFileUrl: string; digitalFileName: string; downloadLimit: string; expiresInDays: string }>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/products/${productId}`, { cache: 'no-store' })
        const data = await res.json()
        const p: Product = data?.product || data
        setProduct(p)
        const initial: Record<string, any> = {}
        for (const v of p.variants || []) {
          const a = (v.attributes || {}) as any
          initial[v.id] = {
            digitalFileUrl: a.digitalFileUrl || a.fileUrl || '',
            digitalFileName: a.digitalFileName || a.fileName || '',
            downloadLimit: typeof a.downloadLimit === 'number' ? String(a.downloadLimit) : '',
            expiresInDays: typeof a.expiresInDays === 'number' ? String(a.expiresInDays) : '',
          }
        }
        setForm(initial)
      } catch (e) {
        toast.error('Falha ao carregar variações')
      } finally {
        setLoading(false)
      }
    })()
  }, [productId])

  const updateField = (variantId: string, field: string, value: string) => {
    setForm(prev => ({ ...prev, [variantId]: { ...prev[variantId], [field]: value } }))
  }

  const saveVariant = async (variant: Variant) => {
    const v = form[variant.id] || { digitalFileUrl: '', digitalFileName: '', downloadLimit: '', expiresInDays: '' }
    if (!v.digitalFileUrl) {
      toast.error('URL do arquivo é obrigatória')
      return
    }
    setSavingId(variant.id)
    try {
      const payload = {
        attributes: {
          digitalFileUrl: v.digitalFileUrl,
          digitalFileName: v.digitalFileName || undefined,
          downloadLimit: v.downloadLimit ? parseInt(v.downloadLimit) : undefined,
          expiresInDays: v.expiresInDays ? parseInt(v.expiresInDays) : undefined,
        }
      }
      const res = await fetch(`/api/admin/variants/${variant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Falha ao salvar variação')
      toast.success('Variação atualizada')
    } catch (e) {
      toast.error('Erro ao atualizar variação')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return null
  if (!product) return null
  if (product.type !== 'DIGITAL') return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Configurações de Download (Variações)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {product.variants?.length ? product.variants.map(variant => (
          <div key={variant.id} className="space-y-3">
            <div className="text-sm font-medium">{variant.name}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="URL do arquivo (https://...)"
                value={form[variant.id]?.digitalFileUrl || ''}
                onChange={(e) => updateField(variant.id, 'digitalFileUrl', e.target.value)}
              />
              <Input
                placeholder="Nome do arquivo (opcional)"
                value={form[variant.id]?.digitalFileName || ''}
                onChange={(e) => updateField(variant.id, 'digitalFileName', e.target.value)}
              />
              <Input
                placeholder="Limite de downloads (opcional)"
                value={form[variant.id]?.downloadLimit || ''}
                onChange={(e) => updateField(variant.id, 'downloadLimit', e.target.value)}
              />
              <Input
                placeholder="Expira em dias (opcional)"
                value={form[variant.id]?.expiresInDays || ''}
                onChange={(e) => updateField(variant.id, 'expiresInDays', e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveVariant(variant)} disabled={savingId === variant.id}>Salvar</Button>
            </div>
            <Separator />
          </div>
        )) : (
          <div className="text-muted-foreground">Nenhuma variação encontrada.</div>
        )}
      </CardContent>
    </Card>
  )
}

