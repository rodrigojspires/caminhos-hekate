'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Eye, Settings2, Landmark, Trash2, Loader2 } from 'lucide-react'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientOptions, setPatientOptions] = useState<UserOption[]>([])
  const [processes, setProcesses] = useState<ProcessSummary[]>([])
  const [form, setForm] = useState({
    patientUserId: '',
    notes: '',
  })

  const userDisplay = useCallback((user: UserOption) => {
    return `${user.name || 'Sem nome'} - ${user.email}`
  }, [])

  const findPatientByInput = useCallback(
    (inputValue: string, options: UserOption[]) => {
      const normalized = inputValue.trim().toLowerCase()
      if (!normalized) return null

      const byLabel = options.find((user) => userDisplay(user).toLowerCase() === normalized)
      if (byLabel) return byLabel

      return options.find((user) => user.email.toLowerCase() === normalized) || null
    },
    [userDisplay],
  )

  const syncPatientSelection = useCallback(
    (inputValue: string, options: UserOption[]) => {
      const matchedUser = findPatientByInput(inputValue, options)

      setForm((prev) => ({
        ...prev,
        patientUserId: matchedUser?.id || '',
      }))
    },
    [findPatientByInput],
  )

  const getUserSearchTerm = useCallback((inputValue: string) => {
    const value = inputValue.trim()
    if (!value) return ''

    const maybeEmail = value.split(' - ').pop()?.trim() || ''
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailPattern.test(maybeEmail)) {
      return maybeEmail
    }

    return value
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [patientsRes, processRes] = await Promise.all([
        fetch('/api/admin/users?limit=40&sortBy=name&sortOrder=asc', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/processos', { cache: 'no-store' }),
      ])

      if (!patientsRes.ok) throw new Error('Falha ao buscar usuários')
      if (!processRes.ok) throw new Error('Falha ao buscar processos')

      const usersData = await patientsRes.json()
      const processData = await processRes.json()

      setPatientOptions(
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

  useEffect(() => {
    if (status !== 'authenticated') return

    const normalizedSearch = patientSearch.trim()
    const controller = new AbortController()

    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: '40',
          sortBy: 'name',
          sortOrder: 'asc',
        })

        const searchTerm = getUserSearchTerm(normalizedSearch)
        if (searchTerm) {
          params.set('search', searchTerm)
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = response.ok ? await response.json() : { users: [] }
        const nextOptions: UserOption[] = Array.isArray(data.users)
          ? data.users.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))
          : []

        setPatientOptions(nextOptions)
        syncPatientSelection(patientSearch, nextOptions)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error(error)
      }
    }, 280)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [getUserSearchTerm, patientSearch, status, syncPatientSelection])

  const createProcess = async () => {
    const resolvedPatientUserId =
      form.patientUserId || findPatientByInput(patientSearch, patientOptions)?.id || ''

    if (!resolvedPatientUserId) {
      toast.error('Selecione um usuário')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/admin/atendimentos/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: resolvedPatientUserId,
          notes: form.notes || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao criar processo')
      }

      toast.success('Processo terapêutico criado')
      setForm({ patientUserId: '', notes: '' })
      setPatientSearch('')
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

  const removeProcess = async (process: ProcessSummary) => {
    const patientName = process.patient?.name || process.patient?.email || 'este paciente'
    const shouldDelete = confirm(
      `Deseja excluir o processo terapêutico de ${patientName}?\n\nEssa ação remove também orçamento, sessões e financeiro relacionados.`,
    )
    if (!shouldDelete) return

    try {
      setDeletingId(process.id)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao excluir processo terapêutico')
      }

      toast.success('Processo terapêutico excluído')
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir processo terapêutico')
    } finally {
      setDeletingId(null)
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

  const patientDatalistId = 'therapeutic-process-patient-datalist'

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
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Usuário</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              type="text"
              list={patientDatalistId}
              value={patientSearch}
              placeholder="Digite nome ou e-mail para buscar"
              onChange={(event) => {
                const value = event.target.value
                setPatientSearch(value)
                syncPatientSelection(value, patientOptions)
              }}
              onBlur={(event) => syncPatientSelection(event.target.value, patientOptions)}
            />
            <datalist id={patientDatalistId}>
              {patientOptions.map((user) => (
                <option key={user.id} value={userDisplay(user)} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Observação inicial (opcional)</label>
            <textarea
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
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
                <th className="px-4 py-3">Criado por</th>
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
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{process.createdBy?.name || 'Sem nome'}</div>
                    <div className="text-muted-foreground">{process.createdBy?.email}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{statusLabel[process.status]}</td>
                  <td className="px-4 py-3 align-top">{formatCurrency(process.budgetTotal || 0)}</td>
                  <td className="px-4 py-3 align-top">{process.sessionsCount || 0}</td>
                  <td className="px-4 py-3 align-top">
                    {process.openInstallmentsCount || 0} em aberto
                    <div className="text-muted-foreground">{formatCurrency(process.openInstallmentsAmount || 0)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded border px-2 py-1 hover:bg-muted"
                        onClick={() => router.push(`/admin/atendimentos/${process.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Abrir
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => removeProcess(process)}
                        disabled={deletingId === process.id}
                      >
                        {deletingId === process.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processes.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={7}>
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
