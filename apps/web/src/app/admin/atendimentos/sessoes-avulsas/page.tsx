'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Plus } from 'lucide-react'
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
      status: 'OPEN' | 'PAID' | 'CANCELED'
    }>
  } | null
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

const paymentMethodLabel = {
  PIX: 'PIX',
  CARD_MERCADO_PAGO: 'Cartão / Mercado Pago',
  NUBANK: 'Nubank',
} as const

const dueDateModeLabel = {
  AUTOMATIC_MONTHLY: 'Mensal automática',
  MANUAL: 'Manual',
} as const

export default function SessoesAvulsasPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [therapies, setTherapies] = useState<Therapy[]>([])
  const [sessions, setSessions] = useState<SingleSession[]>([])

  const [form, setForm] = useState({
    patientUserId: '',
    therapyId: '',
    therapistUserId: '',
    sessionDate: '',
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

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [usersRes, therapiesRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/users?limit=300', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/terapias?active=true', { cache: 'no-store' }),
        fetch('/api/admin/atendimentos/sessoes-avulsas', { cache: 'no-store' }),
      ])

      const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
      const therapiesData = therapiesRes.ok ? await therapiesRes.json() : { therapies: [] }
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] }

      setUsers(
        Array.isArray(usersData.users)
          ? usersData.users.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))
          : [],
      )

      setTherapies(Array.isArray(therapiesData.therapies) ? therapiesData.therapies : [])
      setSessions(Array.isArray(sessionsData.sessions) ? sessionsData.sessions : [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar sessões avulsas')
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
    const value = Number(selectedTherapy.value || 0)
    if (selectedTherapy.valuePerSession) return value
    return Number(selectedTherapy.singleSessionValue ?? selectedTherapy.value ?? 0)
  }, [selectedTherapy])

  useEffect(() => {
    if (!selectedTherapy) return
    if (form.chargedAmount) return
    setForm((prev) => ({
      ...prev,
      chargedAmount: suggestedAmount > 0 ? String(suggestedAmount) : '',
    }))
  }, [selectedTherapy, suggestedAmount, form.chargedAmount])

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
    if (!form.patientUserId || !form.therapyId) {
      toast.error('Selecione usuário e terapia')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/atendimentos/sessoes-avulsas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: form.patientUserId,
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
        sessionDate: '',
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
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar sessão avulsa')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando sessões avulsas...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="py-12 text-center text-muted-foreground">Acesso restrito ao administrador.</div>
  }

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
          <select
            className="rounded border bg-background px-3 py-2"
            value={form.patientUserId}
            onChange={(event) => setForm((prev) => ({ ...prev, patientUserId: event.target.value }))}
          >
            <option value="">Usuário</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || 'Sem nome'} - {user.email}
              </option>
            ))}
          </select>

          <select
            className="rounded border bg-background px-3 py-2"
            value={form.therapyId}
            onChange={(event) => setForm((prev) => ({ ...prev, therapyId: event.target.value }))}
          >
            <option value="">Terapia</option>
            {therapies.map((therapy) => (
              <option key={therapy.id} value={therapy.id}>
                {therapy.name}
              </option>
            ))}
          </select>

          <select
            className="rounded border bg-background px-3 py-2"
            value={form.therapistUserId}
            onChange={(event) => setForm((prev) => ({ ...prev, therapistUserId: event.target.value }))}
          >
            <option value="">Usuário que atendeu (opcional)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || 'Sem nome'} - {user.email}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded border bg-background px-3 py-2"
            value={form.sessionDate}
            onChange={(event) => setForm((prev) => ({ ...prev, sessionDate: event.target.value }))}
          />

          <select
            className="rounded border bg-background px-3 py-2"
            value={form.mode}
            onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as typeof prev.mode }))}
          >
            <option value="">Modo</option>
            <option value="IN_PERSON">Presencial</option>
            <option value="DISTANCE">Distância</option>
            <option value="ONLINE">Online</option>
          </select>

          <select
            className="rounded border bg-background px-3 py-2"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))}
          >
            <option value="PENDING">Pendente</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELED">Cancelada</option>
          </select>

          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded border bg-background px-3 py-2"
            value={form.chargedAmount}
            onChange={(event) => setForm((prev) => ({ ...prev, chargedAmount: event.target.value }))}
            placeholder="Valor cobrado"
          />

          <select
            className="rounded border bg-background px-3 py-2"
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

          <input
            type="number"
            min={1}
            max={36}
            className="rounded border bg-background px-3 py-2"
            value={form.installmentsCount}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                installmentsCount: Math.max(1, Number(event.target.value) || 1),
              }))
            }
            placeholder="Parcelas"
          />

          <select
            className="rounded border bg-background px-3 py-2"
            value={form.dueDateMode}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                dueDateMode: event.target.value as typeof prev.dueDateMode,
              }))
            }
          >
            <option value="AUTOMATIC_MONTHLY">Vencimento mensal automático</option>
            <option value="MANUAL">Vencimento manual</option>
          </select>

          {form.dueDateMode === 'AUTOMATIC_MONTHLY' ? (
            <input
              type="date"
              className="rounded border bg-background px-3 py-2"
              value={form.firstDueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, firstDueDate: event.target.value }))}
            />
          ) : (
            <div className="rounded border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Preencha as datas abaixo
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Valor sugerido da terapia: {formatCurrency(suggestedAmount)}
        </div>

        {form.dueDateMode === 'MANUAL' && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {form.manualDueDates.map((dueDate, index) => (
              <input
                key={index}
                type="date"
                className="rounded border bg-background px-3 py-2"
                value={dueDate}
                onChange={(event) => {
                  const next = [...form.manualDueDates]
                  next[index] = event.target.value
                  setForm((prev) => ({ ...prev, manualDueDates: next }))
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <textarea
            className="min-h-[90px] rounded border bg-background px-3 py-2 text-sm"
            placeholder="Comentários da sessão"
            value={form.comments}
            onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))}
          />
          <textarea
            className="min-h-[90px] rounded border bg-background px-3 py-2 text-sm"
            placeholder="Dados da sessão (texto livre)"
            value={form.sessionData}
            onChange={(event) => setForm((prev) => ({ ...prev, sessionData: event.target.value }))}
          />
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
                <th className="px-3 py-2">Atendente</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2">Parcelas</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sessionItem) => (
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
                      ? `${sessionItem.order.installments.filter((item) => item.status === 'OPEN').length} em aberto / ${sessionItem.order.installmentsCount}`
                      : '-'}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma sessão avulsa registrada.
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
