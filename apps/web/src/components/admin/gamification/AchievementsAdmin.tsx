"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { AchievementCriteriaSchema } from '@/lib/gamification/criteria-schemas'

type RewardForm = {
  rewardType: 'EXTRA_POINTS' | 'PREMIUM_DAYS' | 'SPECIAL_BADGE' | 'COURSE_ACCESS' | 'DISCOUNT_COUPON' | 'EXCLUSIVE_CONTENT'
  rewardValue: number
  description?: string
  isActive?: boolean
}

interface AchievementRow {
  id: string
  name: string
  description: string
  icon?: string
  categoryId: string
  rarity: string
  points: number
  isActive: boolean
}

export function AchievementsAdmin() {
  const [rows, setRows] = useState<AchievementRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [rarity, setRarity] = useState<string | undefined>()
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const fetchRows = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (rarity) params.set('rarity', rarity)
      if (status === 'active') params.set('isActive', 'true')
      if (status === 'inactive') params.set('isActive', 'false')
      const res = await fetch(`/api/admin/gamification/achievements?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao listar conquistas')
      setRows(data.data || [])
    } catch (e) {
      console.error(e)
      toast.error('Falha ao carregar conquistas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRows() }, [])

  // Categories for form
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/gamification/categories')
      const data = await res.json()
      if (res.ok) setCategories(data.data || [])
    } catch (e) {
      console.warn('Falha ao carregar categorias', e)
    }
  }
  useEffect(() => { fetchCategories() }, [])

  const toggleActive = async (row: AchievementRow) => {
    try {
      const res = await fetch(`/api/admin/gamification/achievements/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao atualizar')
      toast.success('Conquista atualizada')
      await fetchRows()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao atualizar conquista')
    }
  }

  const deleteRow = async (row: AchievementRow) => {
    if (!confirm(`Deletar conquista "${row.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/gamification/achievements/${row.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao deletar')
      toast.success('Conquista deletada')
      await fetchRows()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao deletar conquista')
    }
  }

  const filtered = useMemo(() => rows, [rows])

  // Dialog state and form
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AchievementRow | null>(null)
  const [form, setForm] = useState<any>({
    name: '', description: '', icon: '', categoryId: '', rarity: 'COMMON', points: 0, isActive: true, criteria: '{}', metadata: '{}'
  })
  const [rewards, setRewards] = useState<RewardForm[]>([])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', icon: '', categoryId: '', rarity: 'COMMON', points: 0, isActive: true, criteria: '{}', metadata: '{}' })
    setRewards([])
    setOpen(true)
  }

  const openEdit = async (row: AchievementRow) => {
    try {
      setEditing(row)
      // Fetch full details including criteria/metadata and rewards
      const res = await fetch(`/api/admin/gamification/achievements/${row.id}`)
      const data = await res.json()
      if (res.ok && data?.data) {
        const a = data.data
        setForm({
          name: a.name,
          description: a.description,
          icon: a.icon || '',
          categoryId: a.categoryId,
          rarity: a.rarity,
          points: a.points,
          isActive: a.isActive,
          criteria: JSON.stringify(a.criteria ?? {}, null, 2),
          metadata: JSON.stringify(a.metadata ?? {}, null, 2)
        })
        setRewards((a.rewards || []).map((r: any) => ({
          rewardType: r.rewardType,
          rewardValue: r.rewardValue,
          description: r.description ?? undefined,
          isActive: r.isActive,
        })))
      } else {
        // Fallback to basic row info
        setForm({
          name: row.name,
          description: row.description,
          icon: row.icon || '',
          categoryId: row.categoryId,
          rarity: row.rarity,
          points: row.points,
          isActive: row.isActive,
          criteria: '{}',
          metadata: '{}'
        })
        setRewards([])
      }
      setOpen(true)
    } catch (e) {
      console.error('Falha ao abrir edição', e)
      toast.error('Falha ao carregar detalhes da conquista')
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      // Validate JSON fields
      let criteriaObj = {}
      let metadataObj = {}
      try { criteriaObj = form.criteria ? JSON.parse(form.criteria) : {} } catch { toast.error('Criteria inválido (JSON)'); setSaving(false); return }
      try { metadataObj = form.metadata ? JSON.parse(form.metadata) : {} } catch { toast.error('Metadata inválido (JSON)'); setSaving(false); return }

      // Schema validation for criteria
      try { AchievementCriteriaSchema.parse(criteriaObj) } catch (e: any) {
        const msg = e?.errors?.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join('; ') || 'Criteria inválido'
        toast.error(msg)
        setSaving(false)
        return
      }

      const payload = {
        name: form.name,
        description: form.description,
        icon: form.icon || null,
        categoryId: form.categoryId,
        rarity: form.rarity,
        points: Number(form.points) || 0,
        isActive: !!form.isActive,
        criteria: criteriaObj,
        metadata: metadataObj,
        rewards: rewards.map((r) => ({
          rewardType: r.rewardType,
          rewardValue: Number(r.rewardValue) || 0,
          description: r.description || null,
          isActive: r.isActive !== false,
        }))
      }

      const url = editing ? `/api/admin/gamification/achievements/${editing.id}` : '/api/admin/gamification/achievements'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao salvar')
      toast.success('Conquista salva')
      setOpen(false)
      await fetchRows()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao salvar conquista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Conquistas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="md:w-64" />
          <Select value={rarity} onValueChange={(v) => setRarity(v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Raridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COMMON">Comum</SelectItem>
              <SelectItem value="UNCOMMON">Incomum</SelectItem>
              <SelectItem value="RARE">Raro</SelectItem>
              <SelectItem value="EPIC">Épico</SelectItem>
              <SelectItem value="LEGENDARY">Lendário</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchRows} disabled={loading}>Filtrar</Button>
          <div className="flex-1" />
          <Button onClick={openCreate}>Nova Conquista</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Raridade</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[220px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{row.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.rarity}</Badge>
                  </TableCell>
                  <TableCell>{row.points}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>
                      {row.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>
                        {row.isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteRow(row)}>
                        Deletar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Nenhuma conquista encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Conquista' : 'Nova Conquista'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Ícone (URL)</Label>
            <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Raridade</Label>
            <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMMON">Comum</SelectItem>
                <SelectItem value="UNCOMMON">Incomum</SelectItem>
                <SelectItem value="RARE">Raro</SelectItem>
                <SelectItem value="EPIC">Épico</SelectItem>
                <SelectItem value="LEGENDARY">Lendário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pontos</Label>
            <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            <Label>Ativa</Label>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Criteria (JSON)</Label>
            <Textarea className="font-mono text-xs" rows={6} value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} />
          </div>
          <div>
            <Label>Metadata (JSON)</Label>
            <Textarea className="font-mono text-xs" rows={6} value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Recompensas</Label>
            <div className="space-y-2 mt-2">
              {rewards.map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={r.rewardType} onValueChange={(v) => setRewards((prev) => prev.map((it, i) => i === idx ? { ...it, rewardType: v as any } : it))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXTRA_POINTS">Pontos extras</SelectItem>
                        <SelectItem value="PREMIUM_DAYS">Dias premium</SelectItem>
                        <SelectItem value="SPECIAL_BADGE">Badge especial</SelectItem>
                        <SelectItem value="COURSE_ACCESS">Acesso a curso</SelectItem>
                        <SelectItem value="DISCOUNT_COUPON">Cupom de desconto</SelectItem>
                        <SelectItem value="EXCLUSIVE_CONTENT">Conteúdo exclusivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Valor</Label>
                    <Input type="number" value={r.rewardValue} onChange={(e) => setRewards((prev) => prev.map((it, i) => i === idx ? { ...it, rewardValue: Number(e.target.value) } : it))} />
                  </div>
                  <div className="md:col-span-5">
                    <Label className="text-xs">Descrição</Label>
                    <Input value={r.description || ''} onChange={(e) => setRewards((prev) => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} />
                  </div>
                  <div className="md:col-span-1 flex items-center gap-2">
                    <Switch checked={r.isActive !== false} onCheckedChange={(v) => setRewards((prev) => prev.map((it, i) => i === idx ? { ...it, isActive: v } : it))} />
                    <Label className="text-xs">Ativa</Label>
                  </div>
                  <div className="md:col-span-1">
                    <Button variant="destructive" size="sm" onClick={() => setRewards((prev) => prev.filter((_, i) => i !== idx))}>Remover</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setRewards((prev) => ([...prev, { rewardType: 'EXTRA_POINTS', rewardValue: 0, description: '', isActive: true }]))}>
                Adicionar Recompensa
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
