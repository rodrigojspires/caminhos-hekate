'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/therapeutic-care'

type Therapy = {
  id: string
  name: string
  value: number
  valuePerSession: boolean
  defaultSessions: number
  singleSessionValue: number | null
  active: boolean
}

export default function TherapiesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [therapies, setTherapies] = useState<Therapy[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    value: '',
    valuePerSession: true,
    defaultSessions: '1',
    singleSessionValue: '',
    active: true,
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/atendimentos/terapias', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) throw new Error(data?.error || 'Erro ao carregar terapias')

      setTherapies(Array.isArray(data.therapies) ? data.therapies : [])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar terapias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    load()
  }, [status, load])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      value: '',
      valuePerSession: true,
      defaultSessions: '1',
      singleSessionValue: '',
      active: true,
    })
  }

  const startEdit = (therapy: Therapy) => {
    setEditingId(therapy.id)
    setForm({
      name: therapy.name,
      value: String(therapy.value),
      valuePerSession: therapy.valuePerSession,
      defaultSessions: String(therapy.defaultSessions),
      singleSessionValue: therapy.singleSessionValue != null ? String(therapy.singleSessionValue) : '',
      active: therapy.active,
    })
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da terapia')
      return
    }

    const value = Number(form.value)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Informe um valor válido para a terapia')
      return
    }

    try {
      setSaving(true)

      const payload = {
        name: form.name.trim(),
        value,
        valuePerSession: form.valuePerSession,
        defaultSessions: Number(form.defaultSessions) || 1,
        singleSessionValue: form.singleSessionValue === '' ? null : Number(form.singleSessionValue),
        active: form.active,
      }

      const response = await fetch(
        editingId ? `/api/admin/atendimentos/terapias/${editingId}` : '/api/admin/atendimentos/terapias',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao salvar terapia')

      toast.success(editingId ? 'Terapia atualizada' : 'Terapia cadastrada')
      resetForm()
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar terapia')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (therapy: Therapy) => {
    try {
      const response = await fetch(`/api/admin/atendimentos/terapias/${therapy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !therapy.active }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao atualizar status')
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status')
    }
  }

  const removeTherapy = async (therapy: Therapy) => {
    if (!confirm(`Deseja excluir a terapia "${therapy.name}"?`)) return

    try {
      setDeletingId(therapy.id)
      const response = await fetch(`/api/admin/atendimentos/terapias/${therapy.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao excluir terapia')

      if (data?.mode === 'soft') {
        toast.success(data?.message || 'Terapia desativada por possuir vínculos')
      } else {
        toast.success('Terapia excluída')
      }

      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir terapia')
    } finally {
      setDeletingId(null)
    }
  }

  const preview = useMemo(() => {
    const value = Number(form.value || 0)
    const defaultSessions = Math.max(1, Number(form.defaultSessions || 1))
    const unitValue = form.valuePerSession ? value : value / defaultSessions
    const totalValue = form.valuePerSession ? value * defaultSessions : value

    return {
      unitValue: Number.isFinite(unitValue) ? unitValue : 0,
      totalValue: Number.isFinite(totalValue) ? totalValue : 0,
    }
  }, [form.value, form.defaultSessions, form.valuePerSession])

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando terapias...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="py-12 text-center text-muted-foreground">Acesso restrito ao administrador.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-sm hover:bg-muted"
            onClick={() => router.push('/admin/atendimentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Terapias</h1>
          <p className="text-muted-foreground">Configure valores padrão e regras para orçamento.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{editingId ? 'Editar terapia' : 'Nova terapia'}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border bg-background px-3 py-2 md:col-span-2"
            placeholder="Nome da terapia"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />

          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded border bg-background px-3 py-2"
            placeholder="Valor"
            value={form.value}
            onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
          />

          <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.valuePerSession}
              onChange={(event) => setForm((prev) => ({ ...prev, valuePerSession: event.target.checked }))}
            />
            Valor por sessão
          </label>

          <input
            type="number"
            min={1}
            className="rounded border bg-background px-3 py-2"
            placeholder="Sessões por padrão"
            value={form.defaultSessions}
            onChange={(event) => setForm((prev) => ({ ...prev, defaultSessions: event.target.value }))}
          />

          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded border bg-background px-3 py-2"
            placeholder="Valor avulso"
            value={form.singleSessionValue}
            onChange={(event) => setForm((prev) => ({ ...prev, singleSessionValue: event.target.value }))}
          />

          <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Ativa
          </label>
        </div>

        <div className="mt-3 rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
          Pré-visualização com sessões padrão: unitário {formatCurrency(preview.unitValue)} • total {formatCurrency(preview.totalValue)}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            onClick={save}
            disabled={saving}
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar terapia'}
          </button>
          {editingId && (
            <button className="rounded border px-3 py-2 text-sm hover:bg-muted" onClick={resetForm}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">Terapias cadastradas</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Regra</th>
                <th className="px-3 py-2">Sessões padrão</th>
                <th className="px-3 py-2">Valor avulso</th>
                <th className="px-3 py-2">Ativa</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {therapies.map((therapy) => (
                <tr key={therapy.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{therapy.name}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(therapy.value))}</td>
                  <td className="px-3 py-2">{therapy.valuePerSession ? 'Por sessão' : 'Valor fixo da terapia'}</td>
                  <td className="px-3 py-2">{therapy.defaultSessions}</td>
                  <td className="px-3 py-2">{therapy.singleSessionValue != null ? formatCurrency(Number(therapy.singleSessionValue)) : '-'}</td>
                  <td className="px-3 py-2">{therapy.active ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted"
                        onClick={() => startEdit(therapy)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        className="rounded border px-2 py-1 hover:bg-muted"
                        onClick={() => toggleActive(therapy)}
                      >
                        {therapy.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => removeTherapy(therapy)}
                        disabled={deletingId === therapy.id}
                      >
                        {deletingId === therapy.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {therapies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma terapia cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
