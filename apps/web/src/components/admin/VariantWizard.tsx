'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function VariantWizard({ productId, open, onClose, onCreated }: { productId: string; open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: 'Padrão', sku: '', price: '', comparePrice: '', stock: '0', active: true })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async () => {
    if (!form.sku || !form.price) {
      toast.error('Informe SKU e preço')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          name: form.name || 'Padrão',
          sku: form.sku,
          price: Number(form.price),
          comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
          stock: Number(form.stock || '0'),
          active: !!form.active,
        })
      })
      if (!res.ok) throw new Error('Falha ao criar variação')
      toast.success('Variação criada')
      onCreated()
      onClose()
    } catch (e) {
      toast.error('Erro ao criar variação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar variação padrão</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Nome</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">SKU</label>
            <Input value={form.sku} onChange={e => set('sku', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Preço</label>
            <Input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Preço Comparativo</label>
            <Input type="number" step="0.01" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Estoque</label>
            <Input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar variação'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

