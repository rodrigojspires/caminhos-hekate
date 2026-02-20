'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/therapeutic-care'

type Installment = {
  id: string
  source: 'PROCESS' | 'SINGLE'
  installmentNumber: number
  amount: number
  dueDate: string
  status: 'OPEN' | 'PAID' | 'CANCELED'
  paidAt: string | null
  order: {
    id: string
    status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED'
    paymentMethod: 'PIX' | 'CARD_MERCADO_PAGO' | 'NUBANK'
    process?: {
      id: string
      status: string
      patient: {
        id: string
        name: string | null
        email: string
      }
    } | null
    singleSession?: {
      id: string
      sessionDate: string
      therapyNameSnapshot: string
      patient: {
        id: string
        name: string | null
        email: string
      }
    } | null
  }
}

const installmentStatusLabel: Record<Installment['status'], string> = {
  OPEN: 'Em aberto',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
}

export default function AtendimentoFinanceiroPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PAID' | 'CANCELED'>('ALL')
  const [installments, setInstallments] = useState<Installment[]>([])
  const [summary, setSummary] = useState({
    totalOpen: 0,
    totalPaid: 0,
    countOpen: 0,
    countPaid: 0,
  })
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const query = statusFilter === 'ALL' ? '' : `?installmentStatus=${statusFilter}`
      const response = await fetch(`/api/admin/atendimentos/financeiro${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao carregar financeiro')
      setInstallments(Array.isArray(data.installments) ? data.installments : [])
      setSummary(data.summary || { totalOpen: 0, totalPaid: 0, countOpen: 0, countPaid: 0 })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar financeiro')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (status !== 'authenticated') return
    load()
  }, [status, load])

  const markAsPaid = async (installmentId: string) => {
    try {
      setProcessingId(installmentId)
      const response = await fetch(`/api/admin/atendimentos/parcelas/${installmentId}/baixa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: new Date().toISOString() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao dar baixa')
      toast.success('Parcela baixada')
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao dar baixa')
    } finally {
      setProcessingId(null)
    }
  }

  const overdueCount = useMemo(() => {
    const now = new Date()
    return installments.filter((item) => item.status === 'OPEN' && new Date(item.dueDate) < now).length
  }, [installments])

  if (status === 'loading' || loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando financeiro...</div>
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
        <h1 className="text-3xl font-bold tracking-tight">Financeiro dos Atendimentos</h1>
        <p className="text-muted-foreground">Acompanhe parcelas em aberto e realize baixas manuais.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Valor em aberto</div>
          <div className="text-2xl font-semibold">{formatCurrency(summary.totalOpen)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Valor pago</div>
          <div className="text-2xl font-semibold">{formatCurrency(summary.totalPaid)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Parcelas em aberto</div>
          <div className="text-2xl font-semibold">{summary.countOpen}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Vencidas</div>
          <div className="text-2xl font-semibold">{overdueCount}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <select
            className="rounded border bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="ALL">Todas</option>
            <option value="OPEN">Em aberto</option>
            <option value="PAID">Pagas</option>
            <option value="CANCELED">Canceladas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Parcela</th>
                <th className="px-3 py-2">Vencimento</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((item) => {
                const patient =
                  item.source === 'PROCESS' ? item.order.process?.patient : item.order.singleSession?.patient

                return (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2">
                      <div className="font-medium">{patient?.name || 'Sem nome'}</div>
                      <div className="text-muted-foreground">{patient?.email || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      {item.source === 'PROCESS' && item.order.process?.id ? (
                        <button
                          className="rounded border px-2 py-1 hover:bg-muted"
                          onClick={() => router.push(`/admin/atendimentos/${item.order.process?.id}`)}
                        >
                          Abrir processo
                        </button>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 hover:bg-muted"
                          onClick={() => router.push('/admin/atendimentos/sessoes-avulsas')}
                        >
                          Sessão avulsa
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.installmentNumber}</td>
                    <td className="px-3 py-2">{new Date(item.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2">{formatCurrency(Number(item.amount))}</td>
                    <td className="px-3 py-2">{installmentStatusLabel[item.status]}</td>
                    <td className="px-3 py-2">
                      {item.status === 'OPEN' ? (
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                          onClick={() => markAsPaid(item.id)}
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id ? 'Baixando...' : 'Dar baixa'}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.paidAt ? `Pago em ${new Date(item.paidAt).toLocaleDateString('pt-BR')}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {installments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma parcela encontrada para o filtro selecionado.
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
