'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/therapeutic-care'

type UserOption = {
  id: string
  name: string | null
  email: string
}

type Therapy = {
  id: string
  name: string
  value: number
  valuePerSession: boolean
  defaultSessions: number
  singleSessionValue: number | null
  active: boolean
}

type BudgetItem = {
  id: string
  processId: string
  therapyId: string
  quantity: number
  sortOrder: number
  discountPercent: number | null
  discountAmount: number | null
  therapyNameSnapshot: string
  therapyValueSnapshot: number
  valuePerSessionSnapshot: boolean
  singleSessionValueSnapshot: number | null
  unitValue: number
  grossTotal: number
  discountTotal: number
  netTotal: number
}

type TherapeuticSession = {
  id: string
  processId: string
  budgetItemId: string
  sessionNumber: number
  orderIndex: number
  status: 'PENDING' | 'COMPLETED' | 'CANCELED'
  therapistUserId: string | null
  sessionDate: string | null
  comments: string | null
  sessionData: string | null
  mode: 'IN_PERSON' | 'DISTANCE' | 'ONLINE' | null
  therapist?: {
    id: string
    name: string | null
    email: string
  } | null
  budgetItem?: {
    id: string
    therapyNameSnapshot: string
    sortOrder: number
  }
}

type Installment = {
  id: string
  orderId: string
  installmentNumber: number
  amount: number
  dueDate: string
  status: 'OPEN' | 'PAID' | 'CANCELED'
  paidAt: string | null
  paidAmount: number | null
  paymentNote: string | null
}

type TherapeuticOrder = {
  id: string
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED'
  paymentMethod: 'PIX' | 'CARD_MERCADO_PAGO' | 'NUBANK'
  dueDateMode: 'AUTOMATIC_MONTHLY' | 'MANUAL'
  installmentsCount: number
  totalAmount: number
  installments: Installment[]
}

type TherapeuticProcess = {
  id: string
  status: 'IN_ANALYSIS' | 'IN_TREATMENT' | 'NOT_APPROVED' | 'CANCELED' | 'FINISHED'
  notes: string | null
  startedAt: string | null
  createdAt: string
  patient: {
    id: string
    name: string | null
    email: string
    dateOfBirth: string | null
  }
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  budgetItems: BudgetItem[]
  sessions: TherapeuticSession[]
  order: TherapeuticOrder | null
  summary: {
    grossTotal: number
    discountTotal: number
    budgetTotal: number
    sessionsCount: number
    completedSessions: number
    openInstallmentsCount: number
    openInstallmentsAmount: number
    installmentSimulation: Array<{
      installments: number
      installmentValue: number
      amounts: number[]
    }>
  }
}

type SessionDraft = {
  therapistUserId: string
  sessionDate: string
  mode: 'IN_PERSON' | 'DISTANCE' | 'ONLINE' | ''
  comments: string
  sessionData: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELED'
}

const processStatusLabel: Record<TherapeuticProcess['status'], string> = {
  IN_ANALYSIS: 'Em análise',
  IN_TREATMENT: 'Em tratamento',
  NOT_APPROVED: 'Não aprovado',
  CANCELED: 'Cancelado',
  FINISHED: 'Finalizado',
}

const paymentMethodLabel: Record<TherapeuticOrder['paymentMethod'], string> = {
  PIX: 'PIX',
  CARD_MERCADO_PAGO: 'Cartão / Mercado Pago',
  NUBANK: 'Nubank',
}

const dueDateModeLabel: Record<TherapeuticOrder['dueDateMode'], string> = {
  AUTOMATIC_MONTHLY: 'Mensal automática',
  MANUAL: 'Manual',
}

const installmentStatusLabel: Record<Installment['status'], string> = {
  OPEN: 'Em aberto',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function addMonths(baseDate: Date, offset: number) {
  const date = new Date(baseDate)
  date.setMonth(baseDate.getMonth() + offset)
  return date
}

export default function ProcessDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [process, setProcess] = useState<TherapeuticProcess | null>(null)
  const [therapists, setTherapists] = useState<UserOption[]>([])
  const [therapies, setTherapies] = useState<Therapy[]>([])
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, SessionDraft>>({})
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null)
  const [movingBudgetItemId, setMovingBudgetItemId] = useState<string | null>(null)
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null)
  const [deletingProcess, setDeletingProcess] = useState(false)

  const [notesDraft, setNotesDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<TherapeuticProcess['status']>('IN_ANALYSIS')

  const [budgetForm, setBudgetForm] = useState({
    therapyId: '',
    quantity: 1,
    sortOrder: 0,
    discountPercent: '',
    discountAmount: '',
  })
  const [savingBudgetItem, setSavingBudgetItem] = useState(false)

  const [startTreatmentForm, setStartTreatmentForm] = useState({
    paymentMethod: 'PIX' as 'PIX' | 'CARD_MERCADO_PAGO' | 'NUBANK',
    installmentsCount: 1,
    dueDateMode: 'AUTOMATIC_MONTHLY' as 'AUTOMATIC_MONTHLY' | 'MANUAL',
    firstDueDate: '',
    manualDueDates: [''],
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const [processRes, usersRes, therapiesRes] = await Promise.all([
        fetch(`/api/admin/atendimentos/processos/${params.id}`, { cache: 'no-store' }),
        fetch('/api/admin/users?limit=400&sortBy=name&sortOrder=asc&isTherapist=true', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/terapias?active=true', { cache: 'no-store' }),
      ])

      if (!processRes.ok) {
        throw new Error('Processo não encontrado')
      }

      const processData = await processRes.json()
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
      const therapiesData = therapiesRes.ok ? await therapiesRes.json() : { therapies: [] }

      const loadedProcess = processData.process as TherapeuticProcess
      setProcess(loadedProcess)
      setNotesDraft(loadedProcess.notes || '')
      setStatusDraft(loadedProcess.status)
      setTherapists(
        Array.isArray(usersData.users)
          ? usersData.users.map((user: any) => ({ id: user.id, name: user.name, email: user.email }))
          : [],
      )
      setTherapies(Array.isArray(therapiesData.therapies) ? therapiesData.therapies : [])

      const draftMap: Record<string, SessionDraft> = {}
      loadedProcess.sessions.forEach((sessionItem) => {
        draftMap[sessionItem.id] = {
          therapistUserId: sessionItem.therapistUserId || '',
          sessionDate: toDateInput(sessionItem.sessionDate),
          mode: sessionItem.mode || '',
          comments: sessionItem.comments || '',
          sessionData: sessionItem.sessionData || '',
          status: sessionItem.status,
        }
      })

      setSessionDrafts(draftMap)

      setBudgetForm((prev) => ({
        ...prev,
        sortOrder: loadedProcess.budgetItems.length,
      }))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar processo')
      router.push('/admin/atendimentos')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadData()
  }, [status, loadData])

  useEffect(() => {
    setStartTreatmentForm((prev) => {
      const count = Math.max(1, prev.installmentsCount)
      const dueDates = [...prev.manualDueDates]
      while (dueDates.length < count) {
        dueDates.push('')
      }
      while (dueDates.length > count) {
        dueDates.pop()
      }

      if (prev.dueDateMode === 'AUTOMATIC_MONTHLY' && prev.firstDueDate) {
        const first = new Date(prev.firstDueDate)
        if (!Number.isNaN(first.getTime())) {
          for (let i = 0; i < dueDates.length; i += 1) {
            dueDates[i] = toDateInput(addMonths(first, i).toISOString())
          }
        }
      }

      return {
        ...prev,
        manualDueDates: dueDates,
      }
    })
  }, [startTreatmentForm.installmentsCount, startTreatmentForm.dueDateMode, startTreatmentForm.firstDueDate])

  const selectedTherapy = useMemo(
    () => therapies.find((item) => item.id === budgetForm.therapyId) || null,
    [therapies, budgetForm.therapyId],
  )

  const canStartTreatment = process?.status === 'IN_ANALYSIS' && (process?.budgetItems.length || 0) > 0
  const statusOptions = useMemo(() => {
    if (!process) return []

    if (process.status === 'IN_ANALYSIS') {
      return ['IN_ANALYSIS', 'NOT_APPROVED', 'CANCELED'] as TherapeuticProcess['status'][]
    }

    if (process.status === 'IN_TREATMENT') {
      return ['IN_TREATMENT', 'FINISHED', 'CANCELED'] as TherapeuticProcess['status'][]
    }

    return [process.status]
  }, [process])

  const saveNotes = async () => {
    if (!process) return

    try {
      setSavingNotes(true)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao salvar observação')

      setProcess(data.process)
      toast.success('Observação atualizada')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar observação')
    } finally {
      setSavingNotes(false)
    }
  }

  const saveStatus = async () => {
    if (!process) return

    if (statusDraft === 'IN_ANALYSIS' && process.status !== 'IN_ANALYSIS') {
      toast.error('Não é permitido retornar para Em análise')
      return
    }

    try {
      setSavingStatus(true)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusDraft }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao atualizar status')

      setProcess(data.process)
      setStatusDraft(data.process.status)
      toast.success('Status atualizado')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status')
    } finally {
      setSavingStatus(false)
    }
  }

  const addBudgetItem = async () => {
    if (!process || !budgetForm.therapyId) {
      toast.error('Selecione uma terapia')
      return
    }

    try {
      setSavingBudgetItem(true)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}/orcamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapyId: budgetForm.therapyId,
          quantity: budgetForm.quantity,
          sortOrder: budgetForm.sortOrder,
          discountPercent: budgetForm.discountPercent === '' ? null : Number(budgetForm.discountPercent),
          discountAmount: budgetForm.discountAmount === '' ? null : Number(budgetForm.discountAmount),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao incluir item no orçamento')

      toast.success('Item de orçamento incluído')
      setBudgetForm((prev) => ({
        ...prev,
        therapyId: '',
        quantity: 1,
        sortOrder: (process.budgetItems.length || 0) + 1,
        discountPercent: '',
        discountAmount: '',
      }))
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao incluir item no orçamento')
    } finally {
      setSavingBudgetItem(false)
    }
  }

  const removeBudgetItem = async (itemId: string) => {
    if (!process) return

    if (!confirm('Deseja remover este item do orçamento?')) return

    try {
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}/orcamentos/${itemId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao remover item do orçamento')
      toast.success('Item removido')
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover item do orçamento')
    }
  }

  const moveBudgetItem = async (itemId: string, direction: 'UP' | 'DOWN') => {
    if (!process) return

    const orderedItems = [...process.budgetItems].sort((a, b) => {
      if (a.sortOrder === b.sortOrder) return a.id.localeCompare(b.id)
      return a.sortOrder - b.sortOrder
    })

    const currentIndex = orderedItems.findIndex((item) => item.id === itemId)
    if (currentIndex < 0) return

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return

    try {
      setMovingBudgetItemId(itemId)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}/orcamentos/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortOrder: targetIndex,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao mover item do orçamento')

      toast.success('Ordem do orçamento atualizada')
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao mover item do orçamento')
    } finally {
      setMovingBudgetItemId(null)
    }
  }

  const startTreatment = async () => {
    if (!process) return

    try {
      setSavingStatus(true)

      const payload: any = {
        status: 'IN_TREATMENT',
        paymentMethod: startTreatmentForm.paymentMethod,
        installmentsCount: startTreatmentForm.installmentsCount,
        dueDateMode: startTreatmentForm.dueDateMode,
        firstDueDate: startTreatmentForm.firstDueDate || null,
      }

      if (startTreatmentForm.dueDateMode === 'MANUAL') {
        payload.manualDueDates = startTreatmentForm.manualDueDates
      }

      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao iniciar tratamento')

      setProcess(data.process)
      setStatusDraft(data.process.status)
      toast.success('Tratamento iniciado com sessões e pedido gerados')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar tratamento')
    } finally {
      setSavingStatus(false)
    }
  }

  const updateSessionDraft = (sessionId: string, patch: Partial<SessionDraft>) => {
    setSessionDrafts((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        ...patch,
      },
    }))
  }

  const saveSession = async (sessionItem: TherapeuticSession) => {
    const draft = sessionDrafts[sessionItem.id]
    if (!draft) return

    try {
      setSavingSessionId(sessionItem.id)

      const response = await fetch(`/api/admin/atendimentos/sessoes/${sessionItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistUserId: draft.therapistUserId || null,
          sessionDate: draft.sessionDate || null,
          mode: draft.mode || null,
          comments: draft.comments || null,
          sessionData: draft.sessionData || null,
          status: draft.status,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao salvar sessão')

      toast.success('Sessão atualizada')
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar sessão')
    } finally {
      setSavingSessionId(null)
    }
  }

  const markInstallmentAsPaid = async (installment: Installment) => {
    try {
      setPayingInstallmentId(installment.id)
      const response = await fetch(`/api/admin/atendimentos/parcelas/${installment.id}/baixa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAt: new Date().toISOString(),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao dar baixa')

      toast.success('Parcela baixada com sucesso')
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao dar baixa na parcela')
    } finally {
      setPayingInstallmentId(null)
    }
  }

  const deleteProcess = async () => {
    if (!process) return

    const patientName = process.patient?.name || process.patient?.email || 'este paciente'
    const shouldDelete = confirm(
      `Deseja excluir o processo terapêutico de ${patientName}?\n\nEssa ação remove orçamento, sessões e financeiro relacionados.`,
    )
    if (!shouldDelete) return

    try {
      setDeletingProcess(true)
      const response = await fetch(`/api/admin/atendimentos/processos/${process.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao excluir processo terapêutico')
      }

      toast.success('Processo terapêutico excluído')
      router.push('/admin/atendimentos')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir processo terapêutico')
    } finally {
      setDeletingProcess(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando processo...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="py-12 text-center text-muted-foreground">Acesso restrito ao administrador.</div>
  }

  if (!process) {
    return <div className="py-12 text-center text-muted-foreground">Processo não encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-sm hover:bg-muted"
            onClick={() => router.push('/admin/atendimentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Processo Terapêutico</h1>
          <p className="text-muted-foreground">
            {process.patient.name || 'Sem nome'} ({process.patient.email})
          </p>
          <p className="text-xs text-muted-foreground">
            Status atual: {processStatusLabel[process.status]}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          onClick={deleteProcess}
          disabled={deletingProcess}
        >
          {deletingProcess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir processo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total do orçamento</div>
          <div className="text-2xl font-semibold">{formatCurrency(process.summary.budgetTotal)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Sessões</div>
          <div className="text-2xl font-semibold">
            {process.summary.completedSessions}/{process.summary.sessionsCount}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Parcelas em aberto</div>
          <div className="text-2xl font-semibold">{process.summary.openInstallmentsCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Valor em aberto</div>
          <div className="text-2xl font-semibold">{formatCurrency(process.summary.openInstallmentsAmount)}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Observação e status</h2>
        <textarea
          className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2"
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          placeholder="Observações gerais do processo"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            onClick={saveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? 'Salvando...' : 'Salvar observação'}
          </button>

          <select
            className="rounded border bg-background px-3 py-2 text-sm"
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value as TherapeuticProcess['status'])}
            disabled={statusOptions.length <= 1}
          >
            {statusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {processStatusLabel[statusOption]}
              </option>
            ))}
          </select>

          <button
            className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            onClick={saveStatus}
            disabled={savingStatus || statusDraft === process.status || statusOptions.length <= 1}
          >
            {savingStatus ? 'Atualizando...' : 'Atualizar status'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Orçamento</h2>

        {process.status === 'IN_ANALYSIS' && (
          <div className="mb-4 rounded-lg border p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                className="rounded border bg-background px-3 py-2 md:col-span-2"
                value={budgetForm.therapyId}
                onChange={(event) => {
                  const therapy = therapies.find((item) => item.id === event.target.value)
                  setBudgetForm((prev) => ({
                    ...prev,
                    therapyId: event.target.value,
                    quantity: therapy?.defaultSessions || 1,
                  }))
                }}
              >
                <option value="">Selecione a terapia</option>
                {therapies.map((therapy) => (
                  <option key={therapy.id} value={therapy.id}>
                    {therapy.name} ({formatCurrency(Number(therapy.value))})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                className="rounded border bg-background px-3 py-2"
                value={budgetForm.quantity}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, quantity: Number(event.target.value) || 1 }))}
                placeholder="Quantidade"
              />

              <input
                type="number"
                min={0}
                className="rounded border bg-background px-3 py-2"
                value={budgetForm.discountPercent}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, discountPercent: event.target.value }))}
                placeholder="Desconto %"
              />

              <input
                type="number"
                min={0}
                step="0.01"
                className="rounded border bg-background px-3 py-2"
                value={budgetForm.discountAmount}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, discountAmount: event.target.value }))}
                placeholder="Desconto R$"
              />
            </div>
            {selectedTherapy && (
              <p className="mt-2 text-xs text-muted-foreground">
                Regra atual: {selectedTherapy.valuePerSession
                  ? `valor por sessão (${formatCurrency(Number(selectedTherapy.value))}) x quantidade`
                  : `valor fixo da terapia (${formatCurrency(Number(selectedTherapy.value))}) dividido pela quantidade para valor unitário`}
              </p>
            )}
            <div className="mt-3">
              <button
                className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                onClick={addBudgetItem}
                disabled={savingBudgetItem}
              >
                {savingBudgetItem ? 'Incluindo...' : 'Adicionar terapia no orçamento'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">Ordem</th>
                <th className="px-3 py-2">Terapia</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Valor unit.</th>
                <th className="px-3 py-2">Total bruto</th>
                <th className="px-3 py-2">Desconto</th>
                <th className="px-3 py-2">Total final</th>
                {process.status === 'IN_ANALYSIS' && <th className="px-3 py-2">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {process.budgetItems.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{item.therapyNameSnapshot}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(item.unitValue))}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(item.grossTotal))}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(item.discountTotal))}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(Number(item.netTotal))}</td>
                  {process.status === 'IN_ANALYSIS' && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded border p-1 hover:bg-muted disabled:opacity-40"
                          onClick={() => moveBudgetItem(item.id, 'UP')}
                          title="Subir"
                          disabled={movingBudgetItemId === item.id || index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded border p-1 hover:bg-muted disabled:opacity-40"
                          onClick={() => moveBudgetItem(item.id, 'DOWN')}
                          title="Descer"
                          disabled={movingBudgetItemId === item.id || index === process.budgetItems.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      <button
                        className="rounded border p-1 text-red-600 hover:bg-red-50"
                        onClick={() => removeBudgetItem(item.id)}
                        title="Remover"
                        disabled={movingBudgetItemId === item.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {process.budgetItems.length === 0 && (
                <tr>
                  <td colSpan={process.status === 'IN_ANALYSIS' ? 8 : 7} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum item no orçamento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded border p-3">
            <div className="text-sm text-muted-foreground">Total bruto</div>
            <div className="text-xl font-semibold">{formatCurrency(process.summary.grossTotal)}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-sm text-muted-foreground">Descontos</div>
            <div className="text-xl font-semibold">{formatCurrency(process.summary.discountTotal)}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-sm text-muted-foreground">Total final</div>
            <div className="text-xl font-semibold">{formatCurrency(process.summary.budgetTotal)}</div>
          </div>
        </div>

        <div className="mt-4 rounded border p-3">
          <div className="mb-2 text-sm font-medium">Simulação de parcelamento até 7x</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 lg:grid-cols-7">
            {process.summary.installmentSimulation.map((item) => (
              <div key={item.installments} className="rounded border p-2 text-sm">
                <div className="font-medium">{item.installments}x</div>
                <div className="text-muted-foreground">{formatCurrency(item.installmentValue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canStartTreatment && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Iniciar tratamento e gerar pedido</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              className="rounded border bg-background px-3 py-2"
              value={startTreatmentForm.paymentMethod}
              onChange={(event) =>
                setStartTreatmentForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value as typeof prev.paymentMethod,
                }))
              }
            >
              <option value="PIX">PIX</option>
              <option value="CARD_MERCADO_PAGO">Cartão / Mercado Pago</option>
              <option value="NUBANK">Nubank</option>
            </select>

            <input
              type="number"
              min={1}
              max={36}
              className="rounded border bg-background px-3 py-2"
              value={startTreatmentForm.installmentsCount}
              onChange={(event) =>
                setStartTreatmentForm((prev) => ({
                  ...prev,
                  installmentsCount: Math.max(1, Number(event.target.value) || 1),
                }))
              }
            />

            <select
              className="rounded border bg-background px-3 py-2"
              value={startTreatmentForm.dueDateMode}
              onChange={(event) =>
                setStartTreatmentForm((prev) => ({
                  ...prev,
                  dueDateMode: event.target.value as typeof prev.dueDateMode,
                }))
              }
            >
              <option value="AUTOMATIC_MONTHLY">Vencimento mensal automático</option>
              <option value="MANUAL">Datas manuais</option>
            </select>

            {startTreatmentForm.dueDateMode === 'AUTOMATIC_MONTHLY' ? (
              <input
                type="date"
                className="rounded border bg-background px-3 py-2"
                value={startTreatmentForm.firstDueDate}
                onChange={(event) =>
                  setStartTreatmentForm((prev) => ({
                    ...prev,
                    firstDueDate: event.target.value,
                  }))
                }
              />
            ) : (
              <div className="rounded border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Informe as datas abaixo
              </div>
            )}
          </div>

          {startTreatmentForm.dueDateMode === 'MANUAL' && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              {startTreatmentForm.manualDueDates.map((dueDate, index) => (
                <input
                  key={index}
                  type="date"
                  className="rounded border bg-background px-3 py-2"
                  value={dueDate}
                  onChange={(event) => {
                    const next = [...startTreatmentForm.manualDueDates]
                    next[index] = event.target.value
                    setStartTreatmentForm((prev) => ({ ...prev, manualDueDates: next }))
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              onClick={startTreatment}
              disabled={savingStatus}
            >
              {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              Iniciar tratamento
            </button>
            <p className="text-sm text-muted-foreground">
              Essa ação gera as sessões do tratamento e o pedido financeiro.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Tratamento (sessões)</h2>
        <div className="space-y-3">
          {process.sessions.map((sessionItem) => {
            const draft = sessionDrafts[sessionItem.id]
            if (!draft) return null

            return (
              <div key={sessionItem.id} className="rounded border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">
                    Sessão {sessionItem.orderIndex} • {sessionItem.budgetItem?.therapyNameSnapshot || 'Terapia'}
                  </div>
                  <span className="text-xs text-muted-foreground">Status: {draft.status}</span>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    className="rounded border bg-background px-3 py-2 text-sm"
                    value={draft.therapistUserId}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        therapistUserId: event.target.value,
                      })
                    }
                  >
                    <option value="">Terapeuta</option>
                    {therapists.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || 'Sem nome'} - {user.email}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="rounded border bg-background px-3 py-2 text-sm"
                    value={draft.sessionDate}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        sessionDate: event.target.value,
                      })
                    }
                  />

                  <select
                    className="rounded border bg-background px-3 py-2 text-sm"
                    value={draft.mode}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        mode: event.target.value as SessionDraft['mode'],
                      })
                    }
                  >
                    <option value="">Modo</option>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="DISTANCE">Distância</option>
                    <option value="ONLINE">Online</option>
                  </select>

                  <select
                    className="rounded border bg-background px-3 py-2 text-sm"
                    value={draft.status}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        status: event.target.value as SessionDraft['status'],
                      })
                    }
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="COMPLETED">Concluída</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <textarea
                    className="min-h-[80px] rounded border bg-background px-3 py-2 text-sm"
                    placeholder="Comentários da sessão"
                    value={draft.comments}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        comments: event.target.value,
                      })
                    }
                  />
                  <textarea
                    className="min-h-[80px] rounded border bg-background px-3 py-2 text-sm"
                    placeholder="Dados da sessão (texto livre)"
                    value={draft.sessionData}
                    onChange={(event) =>
                      updateSessionDraft(sessionItem.id, {
                        sessionData: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="mt-2">
                  <button
                    className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                    onClick={() => saveSession(sessionItem)}
                    disabled={savingSessionId === sessionItem.id}
                  >
                    {savingSessionId === sessionItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Salvar sessão
                  </button>
                </div>
              </div>
            )
          })}

          {process.sessions.length === 0 && (
            <div className="rounded border border-dashed p-8 text-center text-muted-foreground">
              As sessões serão criadas automaticamente quando o processo mudar para Em tratamento.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Financeiro</h2>

        {!process.order && (
          <div className="rounded border border-dashed p-8 text-center text-muted-foreground">
            O pedido financeiro será criado ao iniciar o tratamento.
          </div>
        )}

        {process.order && (
          <>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded border p-3">
                <div className="text-sm text-muted-foreground">Status do pedido</div>
                <div className="font-semibold">{process.order.status}</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-sm text-muted-foreground">Meio de pagamento</div>
                <div className="font-semibold">{paymentMethodLabel[process.order.paymentMethod]}</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-sm text-muted-foreground">Vencimento</div>
                <div className="font-semibold">{dueDateModeLabel[process.order.dueDateMode]}</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="font-semibold">{formatCurrency(process.order.totalAmount)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2">Parcela</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Baixa</th>
                  </tr>
                </thead>
                <tbody>
                  {process.order.installments.map((installment) => (
                    <tr key={installment.id} className="border-b">
                      <td className="px-3 py-2">{installment.installmentNumber}/{process.order?.installmentsCount}</td>
                      <td className="px-3 py-2">{new Date(installment.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(installment.amount))}</td>
                      <td className="px-3 py-2">{installmentStatusLabel[installment.status]}</td>
                      <td className="px-3 py-2">
                        {installment.status === 'OPEN' ? (
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                            onClick={() => markInstallmentAsPaid(installment)}
                            disabled={payingInstallmentId === installment.id}
                          >
                            {payingInstallmentId === installment.id ? 'Baixando...' : 'Dar baixa'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {installment.paidAt ? `Pago em ${new Date(installment.paidAt).toLocaleDateString('pt-BR')}` : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
