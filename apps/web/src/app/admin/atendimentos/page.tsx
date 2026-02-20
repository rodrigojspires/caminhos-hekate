'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Eye, Settings2, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/therapeutic-care'

type UserOption = {
  id: string
  name: string | null
  email: string
}

type ProcessSummary = {
  id: string
  status: 'IN_ANALYSIS' | 'IN_TREATMENT' | 'NOT_APPROVED' | 'CANCELED' | 'FINISHED'
  notes: string | null
  createdAt: string
  patient: {
    id: string
    name: string | null
    email: string
  }
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  summary?: {
    budgetTotal: number
  }
  budgetTotal: number
  sessionsCount: number
  openInstallmentsCount: number
  openInstallmentsAmount: number
}

const statusLabel: Record<ProcessSummary['status'], string> = {
  IN_ANALYSIS: 'Em análise',
  IN_TREATMENT: 'Em tratamento',
  NOT_APPROVED: 'Não aprovado',
  CANCELED: 'Cancelado',
  FINISHED: 'Finalizado',
}

export default function AtendimentosPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [processes, setProcesses] = useState<ProcessSummary[]>([])
  const [form, setForm] = useState({
    patientUserId: '',
    notes: '',
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [usersRes, processRes] = await Promise.all([
        fetch('/api/admin/users?limit=200', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/processos', { cache: 'no-store' }),
      ])

      if (!usersRes.ok) throw new Error('Falha ao buscar usuários')
      if (!processRes.ok) throw new Error('Falha ao buscar processos')

      const usersData = await usersRes.json()
      const processData = await processRes.json()

      setUsers(
        Array.isArray(usersData.users)
          ? usersData.users.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))
          : [],
      )

      setProcesses(Array.isArray(processData.processes) ? processData.processes : [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar módulo de atendimentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    load()
  }, [load, status])

  const createProcess = async () => {
    if (!form.patientUserId) {
      toast.error('Selecione um usuário')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/admin/atendimentos/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: form.patientUserId,
          notes: form.notes || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao criar processo')
      }

      toast.success('Processo terapêutico criado')
      setForm({ patientUserId: '', notes: '' })
      await load()
      if (data?.process?.id) {
        router.push(`/admin/atendimentos/${data.process.id}`)
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar processo')
    } finally {
      setCreating(false)
    }
  }

  const totals = useMemo(() => {
    return {
      totalProcesses: processes.length,
      inTreatment: processes.filter((item) => item.status === 'IN_TREATMENT').length,
      openInstallmentsAmount: processes.reduce((sum, item) => sum + Number(item.openInstallmentsAmount || 0), 0),
      openInstallmentsCount: processes.reduce((sum, item) => sum + Number(item.openInstallmentsCount || 0), 0),
    }
  }, [processes])

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando atendimentos...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="py-12 text-center text-muted-foreground">Acesso restrito ao administrador.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Atendimento</h1>
          <p className="text-muted-foreground">
            Controle processos terapêuticos, orçamento, sessões e financeiro.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => router.push('/admin/atendimentos/terapias')}
          >
            <Settings2 className="h-4 w-4" />
            Terapias
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => router.push('/admin/atendimentos/sessoes-avulsas')}
          >
            <Plus className="h-4 w-4" />
            Sessões avulsas
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => router.push('/admin/atendimentos/financeiro')}
          >
            <Landmark className="h-4 w-4" />
            Financeiro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Processos</div>
          <div className="text-2xl font-semibold">{totals.totalProcesses}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Em tratamento</div>
          <div className="text-2xl font-semibold">{totals.inTreatment}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Parcelas em aberto</div>
          <div className="text-2xl font-semibold">{totals.openInstallmentsCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Valor em aberto</div>
          <div className="text-2xl font-semibold">{formatCurrency(totals.openInstallmentsAmount)}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Novo Processo Terapêutico</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={form.patientUserId}
            onChange={(event) => setForm((prev) => ({ ...prev, patientUserId: event.target.value }))}
          >
            <option value="">Selecione o usuário</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {(user.name || 'Sem nome')} - {user.email}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border bg-background px-3 py-2 md:col-span-2"
            placeholder="Observação inicial (opcional)"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
        <div className="mt-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            onClick={createProcess}
            disabled={creating}
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Criando...' : 'Criar processo'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">Processos cadastrados</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Orçamento</th>
                <th className="px-4 py-3">Sessões</th>
                <th className="px-4 py-3">Financeiro</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((process) => (
                <tr key={process.id} className="border-b">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{process.patient?.name || 'Sem nome'}</div>
                    <div className="text-muted-foreground">{process.patient?.email}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{statusLabel[process.status]}</td>
                  <td className="px-4 py-3 align-top">{formatCurrency(process.budgetTotal || 0)}</td>
                  <td className="px-4 py-3 align-top">{process.sessionsCount || 0}</td>
                  <td className="px-4 py-3 align-top">
                    {process.openInstallmentsCount || 0} em aberto
                    <div className="text-muted-foreground">{formatCurrency(process.openInstallmentsAmount || 0)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      className="inline-flex items-center gap-2 rounded border px-2 py-1 hover:bg-muted"
                      onClick={() => router.push(`/admin/atendimentos/${process.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {processes.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                    Nenhum processo terapêutico encontrado.
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
