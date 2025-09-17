"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

type Banner = {
  id: string
  title: string
  subtitle?: string | null
  imageUrl: string
  linkUrl?: string | null
  active: boolean
  order: number
}

export default function AdminShopBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [form, setForm] = useState<Partial<Banner>>({ active: true, order: 0 })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/shop/banners', { cache: 'no-store' })
    const data = await res.json()
    setBanners(data.banners || [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shop/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setForm({ active: true, order: 0 })
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover banner?')) return
    await fetch(`/api/admin/shop/banners/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Banners da Loja</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Título" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="Subtítulo (opcional)" value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
            <Input placeholder="Imagem (URL)" value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
            <Input placeholder="Link (URL)" value={form.linkUrl || ''} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} />
            <Input placeholder="Ordem (maior = primeiro)" type="number" value={form.order ?? 0} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Ativo</label>
          </div>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.map(b => (
          <div key={b.id} className="border rounded p-3 space-y-2">
            <div className="text-sm">Ordem: {b.order} • {b.active ? 'Ativo' : 'Inativo'}</div>
            <div className="font-semibold">{b.title}</div>
            <div className="text-xs text-muted-foreground break-all">{b.imageUrl}</div>
            <div className="text-xs text-muted-foreground break-all">{b.linkUrl}</div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => remove(b.id)}>Remover</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

