"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type Plan = {
  id: string
  name: string
  tier: string
  isActive: boolean
  features: any
  maxDownloads: number | null
}

type Product = {
  id: string
  name: string
  type: 'PHYSICAL' | 'DIGITAL'
}

export default function SubscriptionPlansDownloadsPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, { productIds: string[]; downloadLimit?: string; expiresInDays?: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [plansRes, productsRes] = await Promise.all([
          fetch('/api/payments/plans', { cache: 'no-store' }),
          fetch('/api/admin/products?type=DIGITAL&active=true&limit=200', { cache: 'no-store' }),
        ])

        const plansData = await plansRes.json()
        const productsData = await productsRes.json()

        const plansList: Plan[] = plansData.data || plansData.plans || []
        const productsList: Product[] = productsData.products?.map((p: any) => ({ id: p.id, name: p.name, type: p.type })) || []

        setPlans(plansList)
        setProducts(productsList)

        const initial: Record<string, any> = {}
        for (const pl of plansList) {
          const feat = (pl.features || {}) as any
          const d = feat.downloadProductIds || []
          const lim = feat.downloadLimit ?? ''
          const exp = feat.expiresInDays ?? ''
          initial[pl.id] = { productIds: Array.isArray(d) ? d : [], downloadLimit: lim ? String(lim) : '', expiresInDays: exp ? String(exp) : '' }
        }
        setForm(initial)
      } catch (e) {
        console.error(e)
        toast.error('Falha ao carregar planos ou produtos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const productMap = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const toggleProduct = (planId: string, productId: string) => {
    setForm(prev => {
      const cur = prev[planId] || { productIds: [] as string[] }
      const list = new Set(cur.productIds)
      if (list.has(productId)) list.delete(productId)
      else list.add(productId)
      return { ...prev, [planId]: { ...cur, productIds: Array.from(list) } }
    })
  }

  const updateField = (planId: string, field: 'downloadLimit' | 'expiresInDays', value: string) => {
    setForm(prev => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }))
  }

  const savePlan = async (plan: Plan) => {
    const data = form[plan.id] || { productIds: [] as string[] }
    setSaving(plan.id)
    try {
      const payload = {
        features: {
          ...(plan.features || {}),
          downloadProductIds: data.productIds,
          ...(data.downloadLimit ? { downloadLimit: parseInt(data.downloadLimit) } : {}),
          ...(data.expiresInDays ? { expiresInDays: parseInt(data.expiresInDays) } : {}),
        },
      }
      const res = await fetch(`/api/payments/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Falha ao salvar plano')
      toast.success('Plano atualizado')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao atualizar plano')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="container mx-auto py-6">Carregando...</div>

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planos • Downloads</h1>
        <p className="text-muted-foreground">Selecione os produtos digitais incluídos por plano e defina limites.</p>
      </div>

      {plans.map((pl) => (
        <Card key={pl.id}>
          <CardHeader>
            <CardTitle>{pl.name} <span className="text-sm text-muted-foreground">({pl.tier})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Produtos digitais incluídos</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto border rounded p-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form[pl.id]?.productIds?.includes(p.id) || false}
                      onChange={() => toggleProduct(pl.id, p.id)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
                {products.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhum produto digital ativo encontrado.</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">Limite de downloads (opcional)</div>
                <Input
                  placeholder="Ex: 5"
                  value={form[pl.id]?.downloadLimit || ''}
                  onChange={(e) => updateField(pl.id, 'downloadLimit', e.target.value)}
                />
              </div>
              <div>
                <div className="text-sm mb-1">Expira em dias (opcional)</div>
                <Input
                  placeholder="Ex: 7"
                  value={form[pl.id]?.expiresInDays || ''}
                  onChange={(e) => updateField(pl.id, 'expiresInDays', e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={() => savePlan(pl)} disabled={saving === pl.id}>
                {saving === pl.id ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

