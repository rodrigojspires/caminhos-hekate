'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/therapeutic-care'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type UserOption = {
  id: string
  name: string | null
  email: string
  isTherapist?: boolean
}

type Therapy = {
  id: string
  name: string
  value: number
  valuePerSession: boolean
  singleSessionValue: number | null
  active: boolean
}

type SingleSession = {
  id: string
  patientUserId: string
  therapyId: string
  therapistUserId: string | null
  sessionDate: string
  mode: 'IN_PERSON' | 'DISTANCE' | 'ONLINE' | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELED'
  comments: string | null
  sessionData: string | null
  therapyNameSnapshot: string
  chargedAmount: number
  patient: {
    id: string
    name: string | null
    email: string
  }
  therapist?: {
    id: string
    name: string | null
    email: string
  } | null
  order?: {
    id: string
    status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED'
    paymentMethod: 'PIX' | 'CARD_MERCADO_PAGO' | 'NUBANK'
    dueDateMode: 'AUTOMATIC_MONTHLY' | 'MANUAL'
    installmentsCount: number
    totalAmount: number
    installments: Array<{
      id: string
      installmentNumber: number
      dueDate: string
      amount: number
      paidAmount: number | null
      status: 'OPEN' | 'PAID' | 'CANCELED'
      paidAt?: string | null
    }>
  } | null
}

type EditSessionForm = {
  therapistUserId: string
  sessionDate: string
  mode: '' | 'IN_PERSON' | 'DISTANCE' | 'ONLINE'
  status: 'PENDING' | 'COMPLETED' | 'CANCELED'
  chargedAmount: string
  comments: string
  sessionData: string
}

const modeLabel: Record<NonNullable<SingleSession['mode']>, string> = {
  IN_PERSON: 'Presencial',
  DISTANCE: 'Distância',
  ONLINE: 'Online',
}

const statusLabel: Record<SingleSession['status'], string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
}

const installmentStatusLabel: Record<'OPEN' | 'PAID' | 'CANCELED', string> = {
  OPEN: 'Em aberto',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
}

const paymentMethodLabel = {
  PIX: 'PIX',
  CARD_MERCADO_PAGO: 'Cartão / Mercado Pago',
  NUBANK: 'Nubank',
} as const

const dueDateModeLabel = {
  AUTOMATIC_MONTHLY: 'Mensal automática',
  MANUAL: 'Manual',
} as const

function getTodayDateInputValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function toDateInput(value?: string | null): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeCurrencyInput(input: string): number | null {
  const value = input.trim()
  if (!value) return null

  const hasComma = value.includes(',')
  const hasDot = value.includes('.')
  let normalized = value

  if (hasComma && hasDot) {
    normalized = value.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    normalized = value.replace(',', '.')
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return roundCurrency(parsed)
}

function getPaidAmount(installment: {
  amount: number
  paidAmount?: number | null
  status?: 'OPEN' | 'PAID' | 'CANCELED'
}) {
  const paidAmountRaw =
    installment.status === 'PAID' && installment.paidAmount == null
      ? Number(installment.amount || 0)
      : Number(installment.paidAmount || 0)

  return roundCurrency(
    Math.min(
      Math.max(paidAmountRaw, 0),
      Number(installment.amount || 0),
    ),
  )
}

function getRemainingAmount(installment: {
  amount: number
  paidAmount?: number | null
  status?: 'OPEN' | 'PAID' | 'CANCELED'
}) {
  return roundCurrency(Math.max(0, Number(installment.amount || 0) - getPaidAmount(installment)))
}

export default function SessoesAvulsasPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingEdition, setSavingEdition] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null)
  const [therapists, setTherapists] = useState<UserOption[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [patientOptions, setPatientOptions] = useState<UserOption[]>([])
  const [therapies, setTherapies] = useState<Therapy[]>([])
  const [sessions, setSessions] = useState<SingleSession[]>([])
  const [viewSession, setViewSession] = useState<SingleSession | null>(null)
  const [editSession, setEditSession] = useState<SingleSession | null>(null)
  const [editForm, setEditForm] = useState<EditSessionForm | null>(null)

  const [form, setForm] = useState({
    patientUserId: '',
    therapyId: '',
    therapistUserId: '',
    sessionDate: getTodayDateInputValue(),
    mode: '' as '' | 'IN_PERSON' | 'DISTANCE' | 'ONLINE',
    status: 'COMPLETED' as 'PENDING' | 'COMPLETED' | 'CANCELED',
    chargedAmount: '',
    comments: '',
    sessionData: '',
    paymentMethod: 'PIX' as 'PIX' | 'CARD_MERCADO_PAGO' | 'NUBANK',
    dueDateMode: 'AUTOMATIC_MONTHLY' as 'AUTOMATIC_MONTHLY' | 'MANUAL',
    installmentsCount: 1,
    firstDueDate: '',
    manualDueDates: [''],
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

  const load = useCallback(async (): Promise<SingleSession[]> => {
    try {
      setLoading(true)

      const [patientsRes, therapistsRes, therapiesRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/users?limit=40&sortBy=name&sortOrder=asc', { cache: 'no-store' }),
        fetch('/api/admin/users?limit=400&sortBy=name&sortOrder=asc&isTherapist=true', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/terapias?active=true', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/sessoes-avulsas', { cache: 'no-store' }),
      ])

      const patientsData = patientsRes.ok ? await patientsRes.json() : { users: [] }
      const therapistsData = therapistsRes.ok ? await therapistsRes.json() : { users: [] }
      const therapiesData = therapiesRes.ok ? await therapiesRes.json() : { therapies: [] }
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] }

      setPatientOptions(
        Array.isArray(patientsData.users)
          ? patientsData.users.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))
          : [],
      )

      setTherapists(
        Array.isArray(therapistsData.users)
          ? therapistsData.users.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              isTherapist: Boolean(user.isTherapist),
            }))
          : [],
      )

      const nextTherapies = Array.isArray(therapiesData.therapies) ? therapiesData.therapies : []
      const nextSessions: SingleSession[] = Array.isArray(sessionsData.sessions) ? sessionsData.sessions : []

      setTherapies(nextTherapies)
      setSessions(nextSessions)
      return nextSessions
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar sessões avulsas')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    load()
  }, [status, load])

  const selectedTherapy = useMemo(
    () => therapies.find((item) => item.id === form.therapyId) || null,
    [therapies, form.therapyId],
  )

  const suggestedAmount = useMemo(() => {
    if (!selectedTherapy) return 0
    return Number(selectedTherapy.singleSessionValue ?? selectedTherapy.value ?? 0)
  }, [selectedTherapy])

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

  useEffect(() => {
    setForm((prev) => {
      const count = Math.max(1, prev.installmentsCount)
      const dueDates = [...prev.manualDueDates]

      while (dueDates.length < count) dueDates.push('')
      while (dueDates.length > count) dueDates.pop()

      if (prev.dueDateMode === 'AUTOMATIC_MONTHLY' && prev.firstDueDate) {
        const firstDate = new Date(prev.firstDueDate)
        if (!Number.isNaN(firstDate.getTime())) {
          for (let i = 0; i < dueDates.length; i += 1) {
            const date = new Date(firstDate)
            date.setMonth(firstDate.getMonth() + i)
            dueDates[i] = String(date.toISOString()).slice(0, 10)
          }
        }
      }

      return {
        ...prev,
        manualDueDates: dueDates,
      }
    })
  }, [form.installmentsCount, form.dueDateMode, form.firstDueDate])

  const createSession = async () => {
    const resolvedPatientUserId =
      form.patientUserId || findPatientByInput(patientSearch, patientOptions)?.id || ''

    if (!resolvedPatientUserId || !form.therapyId) {
      toast.error('Selecione um usuário válido e a terapia')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/atendimentos/sessoes-avulsas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: resolvedPatientUserId,
          therapyId: form.therapyId,
          therapistUserId: form.therapistUserId || null,
          sessionDate: form.sessionDate || null,
          mode: form.mode || null,
          status: form.status,
          chargedAmount: form.chargedAmount ? Number(form.chargedAmount) : undefined,
          comments: form.comments || null,
          sessionData: form.sessionData || null,
          paymentMethod: form.paymentMethod,
          dueDateMode: form.dueDateMode,
          installmentsCount: form.installmentsCount,
          firstDueDate: form.firstDueDate || null,
          manualDueDates: form.dueDateMode === 'MANUAL' ? form.manualDueDates : undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao criar sessão avulsa')

      toast.success('Sessão avulsa registrada')
      setForm({
        patientUserId: '',
        therapyId: '',
        therapistUserId: '',
        sessionDate: getTodayDateInputValue(),
        mode: '',
        status: 'COMPLETED',
        chargedAmount: '',
        comments: '',
        sessionData: '',
        paymentMethod: 'PIX',
        dueDateMode: 'AUTOMATIC_MONTHLY',
        installmentsCount: 1,
        firstDueDate: '',
        manualDueDates: [''],
      })
      setPatientSearch('')
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar sessão avulsa')
    } finally {
      setSaving(false)
    }
  }

  const refreshAfterMutation = useCallback(async () => {
    const nextSessions = await load()
    setViewSession((prev) => (prev ? nextSessions.find((item) => item.id === prev.id) || null : null))
    setEditSession((prev) => (prev ? nextSessions.find((item) => item.id === prev.id) || null : null))
    return nextSessions
  }, [load])

  const openEditSession = (sessionItem: SingleSession) => {
    setEditSession(sessionItem)
    setEditForm({
      therapistUserId: sessionItem.therapistUserId || '',
      sessionDate: toDateInput(sessionItem.sessionDate),
      mode: sessionItem.mode || '',
      status: sessionItem.status,
      chargedAmount: String(Number(sessionItem.chargedAmount || 0)),
      comments: sessionItem.comments || '',
      sessionData: sessionItem.sessionData || '',
    })
  }

  const saveEditedSession = async () => {
    if (!editSession || !editForm) return

    if (!editForm.sessionDate) {
      toast.error('Informe a data da sessão')
      return
    }

    try {
      setSavingEdition(true)
      const response = await fetch(`/api/admin/atendimentos/sessoes-avulsas/${editSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistUserId: editForm.therapistUserId || null,
          sessionDate: editForm.sessionDate,
          mode: editForm.mode || null,
          status: editForm.status,
          chargedAmount: editForm.chargedAmount ? Number(editForm.chargedAmount) : undefined,
          comments: editForm.comments || null,
          sessionData: editForm.sessionData || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao atualizar sessão avulsa')

      toast.success('Sessão avulsa atualizada')
      await refreshAfterMutation()
      setEditSession(null)
      setEditForm(null)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar sessão avulsa')
    } finally {
      setSavingEdition(false)
    }
  }

  const removeSingleSession = async (sessionItem: SingleSession) => {
    if (!confirm('Deseja excluir esta sessão avulsa? O financeiro vinculado também será removido.')) return

    try {
      setDeletingSessionId(sessionItem.id)
      const response = await fetch(`/api/admin/atendimentos/sessoes-avulsas/${sessionItem.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao excluir sessão avulsa')

      toast.success('Sessão avulsa excluída')
      await refreshAfterMutation()
      if (viewSession?.id === sessionItem.id) setViewSession(null)
      if (editSession?.id === sessionItem.id) {
        setEditSession(null)
        setEditForm(null)
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir sessão avulsa')
    } finally {
      setDeletingSessionId(null)
    }
  }

  const markInstallmentAsPaid = async (installment: {
    id: string
    amount: number
    paidAmount?: number | null
  }) => {
    const remainingAmount = getRemainingAmount(installment)
    if (remainingAmount <= 0) {
      toast.error('Parcela já está quitada')
      return
    }

    const input = window.prompt(
      `Saldo em aberto: ${formatCurrency(remainingAmount)}.\nInforme o valor pago agora (deixe vazio para quitar tudo):`,
      String(remainingAmount.toFixed(2)).replace('.', ','),
    )

    if (input === null) return

    const normalizedInput = input.trim()
    const paidAmount =
      normalizedInput === '' ? remainingAmount : normalizeCurrencyInput(normalizedInput)

    if (!paidAmount || paidAmount <= 0) {
      toast.error('Informe um valor de baixa válido')
      return
    }

    if (paidAmount > remainingAmount) {
      toast.error(`O valor informado excede o saldo da parcela (${formatCurrency(remainingAmount)})`)
      return
    }

    try {
      setPayingInstallmentId(installment.id)
      const response = await fetch(`/api/admin/atendimentos/parcelas/${installment.id}/baixa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAt: new Date().toISOString(),
          paidAmount,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao dar baixa na parcela')

      const fullyPaid = Boolean(data?.payment?.fullyPaid)
      toast.success(fullyPaid ? 'Parcela quitada com sucesso' : 'Baixa parcial registrada')
      await refreshAfterMutation()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao dar baixa na parcela')
    } finally {
      setPayingInstallmentId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando sessões avulsas...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="py-12 text-center text-muted-foreground">Acesso restrito ao administrador.</div>
  }

  const patientDatalistId = 'single-session-patient-datalist'

  return (
    <div className="space-y-6">
      <div>
        <button
          className="mb-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-sm hover:bg-muted"
          onClick={() => router.push('/admin/atendimentos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Sessões Avulsas</h1>
        <p className="text-muted-foreground">
          Registre sessões de terapia sem abrir processo terapêutico.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Nova sessão avulsa</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Usuário</label>
            <input
              className="w-full rounded border bg-background px-3 py-2"
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Terapia</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.therapyId}
              onChange={(event) => {
                const therapyId = event.target.value
                const therapy = therapies.find((item) => item.id === therapyId) || null
                const therapyAmount = Number(therapy?.singleSessionValue ?? therapy?.value ?? 0)

                setForm((prev) => ({
                  ...prev,
                  therapyId,
                  chargedAmount: therapyId ? String(therapyAmount > 0 ? therapyAmount : '') : '',
                }))
              }}
            >
              <option value="">Selecione</option>
              {therapies.map((therapy) => (
                <option key={therapy.id} value={therapy.id}>
                  {therapy.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Terapeuta</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.therapistUserId}
              onChange={(event) => setForm((prev) => ({ ...prev, therapistUserId: event.target.value }))}
            >
              <option value="">Não informado</option>
              {therapists.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || 'Sem nome'} - {user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data da sessão</label>
            <input
              type="date"
              className="w-full rounded border bg-background px-3 py-2"
              value={form.sessionDate}
              onChange={(event) => setForm((prev) => ({ ...prev, sessionDate: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Modo</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.mode}
              onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as typeof prev.mode }))}
            >
              <option value="">Selecione</option>
              <option value="IN_PERSON">Presencial</option>
              <option value="DISTANCE">Distância</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))}
            >
              <option value="PENDING">Pendente</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Valor avulso</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded border bg-background px-3 py-2"
              value={form.chargedAmount}
              onChange={(event) => setForm((prev) => ({ ...prev, chargedAmount: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.paymentMethod}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value as typeof prev.paymentMethod,
                }))
              }
            >
              <option value="PIX">PIX</option>
              <option value="CARD_MERCADO_PAGO">Cartão / Mercado Pago</option>
              <option value="NUBANK">Nubank</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Número de parcelas</label>
            <input
              type="number"
              min={1}
              max={36}
              className="w-full rounded border bg-background px-3 py-2"
              value={form.installmentsCount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  installmentsCount: Math.max(1, Number(event.target.value) || 1),
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Modo de vencimento</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={form.dueDateMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  dueDateMode: event.target.value as typeof prev.dueDateMode,
                }))
              }
            >
              <option value="AUTOMATIC_MONTHLY">Mensal automático</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {form.dueDateMode === 'AUTOMATIC_MONTHLY' ? 'Primeiro vencimento' : 'Datas manuais'}
            </label>
            {form.dueDateMode === 'AUTOMATIC_MONTHLY' ? (
              <input
                type="date"
                className="w-full rounded border bg-background px-3 py-2"
                value={form.firstDueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, firstDueDate: event.target.value }))}
              />
            ) : (
              <div className="rounded border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Preencha as datas abaixo
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Valor sugerido da terapia: {formatCurrency(suggestedAmount)}
        </div>

        {form.dueDateMode === 'MANUAL' && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {form.manualDueDates.map((dueDate, index) => (
              <div key={index} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{`${index + 1}ª parcela`}</label>
                <input
                  type="date"
                  className="w-full rounded border bg-background px-3 py-2"
                  value={dueDate}
                  onChange={(event) => {
                    const next = [...form.manualDueDates]
                    next[index] = event.target.value
                    setForm((prev) => ({ ...prev, manualDueDates: next }))
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Comentários da sessão</label>
            <textarea
              className="min-h-[90px] w-full rounded border bg-background px-3 py-2 text-sm"
              value={form.comments}
              onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Dados da sessão</label>
            <textarea
              className="min-h-[90px] w-full rounded border bg-background px-3 py-2 text-sm"
              value={form.sessionData}
              onChange={(event) => setForm((prev) => ({ ...prev, sessionData: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            onClick={createSession}
            disabled={saving}
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Gravando...' : 'Gravar sessão avulsa'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">Sessões avulsas registradas</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Terapia</th>
                <th className="px-3 py-2">Modo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Terapeuta</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2">Parcelas</th>
                <th className="px-3 py-2">Baixa</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sessionItem) => {
                const openInstallments = sessionItem.order?.installments.filter((item) => item.status === 'OPEN') || []
                const nextOpenInstallment = openInstallments[0]
                const paidInstallmentsCount = sessionItem.order
                  ? sessionItem.order.installments.filter((item) => item.status === 'PAID').length
                  : 0
                const paidAmountTotal = sessionItem.order
                  ? roundCurrency(sessionItem.order.installments.reduce((sum, item) => sum + getPaidAmount(item), 0))
                  : 0
                const remainingAmountTotal = sessionItem.order
                  ? roundCurrency(sessionItem.order.installments.reduce((sum, item) => sum + getRemainingAmount(item), 0))
                  : 0

                return (
                  <tr key={sessionItem.id} className="border-b">
                    <td className="px-3 py-2">{new Date(sessionItem.sessionDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{sessionItem.patient?.name || 'Sem nome'}</div>
                      <div className="text-muted-foreground">{sessionItem.patient?.email}</div>
                    </td>
                    <td className="px-3 py-2">{sessionItem.therapyNameSnapshot}</td>
                    <td className="px-3 py-2">{sessionItem.mode ? modeLabel[sessionItem.mode] : '-'}</td>
                    <td className="px-3 py-2">{statusLabel[sessionItem.status]}</td>
                    <td className="px-3 py-2">{formatCurrency(Number(sessionItem.chargedAmount))}</td>
                    <td className="px-3 py-2">{sessionItem.therapist?.name || '-'}</td>
                    <td className="px-3 py-2">
                      {sessionItem.order
                        ? `${paymentMethodLabel[sessionItem.order.paymentMethod]} • ${dueDateModeLabel[sessionItem.order.dueDateMode]}`
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {sessionItem.order
                        ? `${openInstallments.length} em aberto / ${paidInstallmentsCount} pagas`
                        : '-'}
                      {sessionItem.order && (
                        <div className="text-xs text-muted-foreground">
                          Pago: {formatCurrency(paidAmountTotal)} • Saldo: {formatCurrency(remainingAmountTotal)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!sessionItem.order && <span className="text-muted-foreground">-</span>}
                      {sessionItem.order && !nextOpenInstallment && <span className="text-green-600">Quitado</span>}
                      {sessionItem.order && nextOpenInstallment && (
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                          onClick={() => markInstallmentAsPaid(nextOpenInstallment)}
                          disabled={payingInstallmentId === nextOpenInstallment.id}
                        >
                          {payingInstallmentId === nextOpenInstallment.id
                            ? 'Baixando...'
                            : `Baixar ${nextOpenInstallment.installmentNumber}/${sessionItem.order.installmentsCount}`}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => setViewSession(sessionItem)}
                        >
                          <Eye className="h-3 w-3" />
                          Visualizar
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => openEditSession(sessionItem)}
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => removeSingleSession(sessionItem)}
                          disabled={deletingSessionId === sessionItem.id}
                        >
                          <Trash2 className="h-3 w-3" />
                          {deletingSessionId === sessionItem.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma sessão avulsa registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewSession} onOpenChange={(open) => !open && setViewSession(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar sessão avulsa</DialogTitle>
            <DialogDescription>Detalhes da sessão e do financeiro.</DialogDescription>
          </DialogHeader>

          {viewSession && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Usuário</div>
                  <div className="font-medium">{viewSession.patient?.name || 'Sem nome'}</div>
                  <div className="text-muted-foreground">{viewSession.patient?.email}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Terapia</div>
                  <div className="font-medium">{viewSession.therapyNameSnapshot}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Data da sessão</div>
                  <div className="font-medium">{new Date(viewSession.sessionDate).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium">{statusLabel[viewSession.status]}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Modo</div>
                  <div className="font-medium">{viewSession.mode ? modeLabel[viewSession.mode] : '-'}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Terapeuta</div>
                  <div className="font-medium">{viewSession.therapist?.name || 'Não informado'}</div>
                </div>
                <div className="rounded border p-3 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Valor cobrado</div>
                  <div className="text-base font-semibold">{formatCurrency(Number(viewSession.chargedAmount))}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Comentários</div>
                  <div className="whitespace-pre-wrap">{viewSession.comments || '-'}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Dados da sessão</div>
                  <div className="whitespace-pre-wrap">{viewSession.sessionData || '-'}</div>
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">Financeiro</div>
                {!viewSession.order && (
                  <div className="text-muted-foreground">Nenhum pedido financeiro encontrado.</div>
                )}

                {viewSession.order && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {paymentMethodLabel[viewSession.order.paymentMethod]} •{' '}
                      {dueDateModeLabel[viewSession.order.dueDateMode]} •{' '}
                      {viewSession.order.installmentsCount} parcelas
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="px-2 py-1">Parcela</th>
                            <th className="px-2 py-1">Vencimento</th>
                            <th className="px-2 py-1">Valor</th>
                            <th className="px-2 py-1">Pago</th>
                            <th className="px-2 py-1">Saldo</th>
                            <th className="px-2 py-1">Status</th>
                            <th className="px-2 py-1">Baixa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewSession.order.installments.map((installment) => {
                            const paidAmount = getPaidAmount(installment)
                            const remainingAmount = getRemainingAmount(installment)
                            const statusText =
                              installment.status === 'OPEN' && paidAmount > 0
                                ? `${installmentStatusLabel[installment.status]} (parcial)`
                                : installmentStatusLabel[installment.status]

                            return (
                              <tr key={installment.id} className="border-b">
                                <td className="px-2 py-1">
                                  {installment.installmentNumber}/{viewSession.order?.installmentsCount}
                                </td>
                                <td className="px-2 py-1">{new Date(installment.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-2 py-1">{formatCurrency(Number(installment.amount))}</td>
                                <td className="px-2 py-1">{formatCurrency(paidAmount)}</td>
                                <td className="px-2 py-1">{formatCurrency(remainingAmount)}</td>
                                <td className="px-2 py-1">{statusText}</td>
                                <td className="px-2 py-1">
                                  {installment.status === 'OPEN' ? (
                                    <button
                                      className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                      onClick={() => markInstallmentAsPaid(installment)}
                                      disabled={payingInstallmentId === installment.id}
                                    >
                                      {payingInstallmentId === installment.id ? 'Baixando...' : 'Dar baixa'}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editSession}
        onOpenChange={(open) => {
          if (open) return
          setEditSession(null)
          setEditForm(null)
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar sessão avulsa</DialogTitle>
            <DialogDescription>Atualize os dados da sessão selecionada.</DialogDescription>
          </DialogHeader>

          {editSession && editForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Data da sessão</label>
                  <input
                    type="date"
                    className="w-full rounded border bg-background px-3 py-2"
                    value={editForm.sessionDate}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, sessionDate: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Terapeuta</label>
                  <select
                    className="w-full rounded border bg-background px-3 py-2"
                    value={editForm.therapistUserId}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, therapistUserId: event.target.value } : prev))
                    }
                  >
                    <option value="">Não informado</option>
                    {therapists.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || 'Sem nome'} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Modo</label>
                  <select
                    className="w-full rounded border bg-background px-3 py-2"
                    value={editForm.mode}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, mode: event.target.value as EditSessionForm['mode'] } : prev,
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="DISTANCE">Distância</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    className="w-full rounded border bg-background px-3 py-2"
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, status: event.target.value as EditSessionForm['status'] } : prev,
                      )
                    }
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="COMPLETED">Concluída</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Valor avulso</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded border bg-background px-3 py-2"
                    value={editForm.chargedAmount}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, chargedAmount: event.target.value } : prev))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Comentários da sessão</label>
                  <textarea
                    className="min-h-[90px] w-full rounded border bg-background px-3 py-2 text-sm"
                    value={editForm.comments}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, comments: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Dados da sessão</label>
                  <textarea
                    className="min-h-[90px] w-full rounded border bg-background px-3 py-2 text-sm"
                    value={editForm.sessionData}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, sessionData: event.target.value } : prev))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="rounded border px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    setEditSession(null)
                    setEditForm(null)
                  }}
                  disabled={savingEdition}
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  onClick={saveEditedSession}
                  disabled={savingEdition}
                >
                  {savingEdition && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar alterações
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
