'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type Coupon = {
  id?: string
  code: string
  description?: string
  discountType: 'PERCENT' | 'AMOUNT'
  discountValue: number
  minPurchase?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  validFrom: string
  validUntil: string
  active: boolean
}

export default function CouponForm({ initial, onSubmit, onCancel }: { initial?: Partial<Coupon>; onSubmit: (c: Partial<Coupon>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Coupon>>({
    code: initial?.code || '',
    description: initial?.description || '',
    discountType: (initial?.discountType as any) || 'PERCENT',
    discountValue: initial?.discountValue ?? 0,
    minPurchase: initial?.minPurchase ?? undefined,
    maxDiscount: initial?.maxDiscount ?? undefined,
    usageLimit: initial?.usageLimit ?? undefined,
    validFrom: initial?.validFrom || new Date().toISOString().slice(0, 16),
    validUntil: initial?.validUntil || new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    active: initial?.active ?? true,
  })
  const set = (k: keyof Coupon, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-sm">Código *</label>
        <Input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="PROMO10" />
      </div>
      <div>
        <label className="text-sm">Descrição</label>
        <Input value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Cupom promocional" />
      </div>
      <div>
        <label className="text-sm">Tipo *</label>
        <Select value={form.discountType as any} onValueChange={(v) => set('discountType', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENT">Percentual (%)</SelectItem>
            <SelectItem value="AMOUNT">Valor (R$)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm">Valor *</label>
        <Input type="number" step="0.01" value={form.discountValue as any} onChange={e => set('discountValue', parseFloat(e.target.value) || 0)} />
      </div>
      <div>
        <label className="text-sm">Compra mínima (R$)</label>
        <Input type="number" step="0.01" value={(form.minPurchase as any) ?? ''} onChange={e => set('minPurchase', e.target.value ? parseFloat(e.target.value) : undefined)} />
      </div>
      <div>
        <label className="text-sm">Desconto máximo (R$)</label>
        <Input type="number" step="0.01" value={(form.maxDiscount as any) ?? ''} onChange={e => set('maxDiscount', e.target.value ? parseFloat(e.target.value) : undefined)} />
      </div>
      <div>
        <label className="text-sm">Limite de uso</label>
        <Input type="number" value={(form.usageLimit as any) ?? ''} onChange={e => set('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)} />
      </div>
      <div>
        <label className="text-sm">Válido de *</label>
        <Input type="datetime-local" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} />
      </div>
      <div>
        <label className="text-sm">Válido até *</label>
        <Input type="datetime-local" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} />
      </div>
      <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSubmit(form)}>Salvar</Button>
      </div>
    </div>
  )
}

