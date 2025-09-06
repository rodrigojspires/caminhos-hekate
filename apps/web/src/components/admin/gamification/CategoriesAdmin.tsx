"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface CategoryRow {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  order: number
}

export function CategoriesAdmin() {
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  const fetchRows = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/gamification/categories')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao listar categorias')
      setRows(data.data || [])
    } catch (e) {
      console.error(e)
      toast.error('Falha ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchRows() }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(r => r.name.toLowerCase().includes(qq) || (r.description || '').toLowerCase().includes(qq))
  }, [rows, q])

  // Dialog state + form
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [form, setForm] = useState<any>({ name: '', description: '', icon: '', color: '', order: 0 })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', icon: '', color: '', order: 0 })
    setOpen(true)
  }

  const openEdit = (row: CategoryRow) => {
    setEditing(row)
    setForm({ name: row.name, description: row.description || '', icon: row.icon || '', color: row.color || '', order: row.order || 0 })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        name: form.name,
        description: form.description || null,
        icon: form.icon || null,
        color: form.color || null,
        order: Number(form.order) || 0
      }
      const url = editing ? `/api/admin/gamification/categories/${editing.id}` : '/api/admin/gamification/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao salvar categoria')
      toast.success('Categoria salva')
      setOpen(false)
      await fetchRows()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao salvar categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: CategoryRow) => {
    if (!confirm(`Deletar categoria "${row.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/gamification/categories/${row.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao deletar categoria')
      toast.success('Categoria deletada')
      await fetchRows()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao deletar categoria')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Conquistas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="md:w-64" />
            <div className="flex-1" />
            <Button onClick={openCreate}>Nova Categoria</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ordem</TableHead>
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
                      {row.color ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="text-xs">{row.color}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{row.order ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Editar</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>Deletar</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      {loading ? 'Carregando...' : 'Nenhuma categoria encontrada'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Ícone (URL)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div>
              <Label>Cor (ex: #3B82F6)</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
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

