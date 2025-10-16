'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CouponForm, { type Coupon } from '@/components/admin/CouponForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function CouponsAdminPage() {
  const [list, setList] = useState<Coupon[]>([] as any)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<'ALL'|'true'|'false'>('ALL')
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (active !== 'ALL') params.set('active', active)
    const res = await fetch(`/api/admin/coupons?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setList(data.coupons || [])
  }, [search, active])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => list.map(c => (
    <tr key={c.id} className="border-b">
      <td className="px-3 py-2 font-mono text-sm">{c.code}</td>
      <td className="px-3 py-2 text-sm">{c.discountType === 'PERCENT' ? `${c.discountValue}%` : `R$ ${Number(c.discountValue).toFixed(2)}`}</td>
      <td className="px-3 py-2 text-sm">{c.usageLimit ?? '—'} / { (c as any).usageCount ?? 0 }</td>
      <td className="px-3 py-2 text-sm">{new Date(c.validFrom as any).toLocaleString('pt-BR')}</td>
      <td className="px-3 py-2 text-sm">{new Date(c.validUntil as any).toLocaleString('pt-BR')}</td>
      <td className="px-3 py-2 text-sm">{c.active ? 'Ativo' : 'Inativo'}</td>
      <td className="px-3 py-2 text-right">
        <Button variant="outline" size="sm" onClick={() => setEditing(c)}>Editar</Button>
        <Button variant="destructive" size="sm" className="ml-2" onClick={async () => {
          if (!confirm(`Excluir cupom ${c.code}?`)) return
          const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' })
          if (res.ok) load()
        }}>Excluir</Button>
      </td>
    </tr>
  )), [list, load])

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground">Gerencie códigos promocionais e regras de desconto</p>
        </div>
        <Button onClick={() => setCreating(true)}>Novo Cupom</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Buscar por código/descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={active} onValueChange={(v) => setActive(v as any)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={load}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cupons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Desconto</th>
                  <th className="px-3 py-2">Uso</th>
                  <th className="px-3 py-2">Início</th>
                  <th className="px-3 py-2">Fim</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={creating} onOpenChange={(v) => !v && setCreating(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cupom</DialogTitle></DialogHeader>
          <CouponForm
            onSubmit={async (data) => {
              const res = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
              if (res.ok) { setCreating(false); load() }
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Cupom</DialogTitle></DialogHeader>
          {editing && (
            <CouponForm
              initial={editing}
              onSubmit={async (data) => {
                const res = await fetch(`/api/admin/coupons/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
                if (res.ok) { setEditing(null); load() }
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
