'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BillingInterval = 'MONTHLY' | 'YEARLY'
type PlanType = 'SUBSCRIPTION' | 'SUBSCRIPTION_LIMITED'

type MahaPlan = {
  id: string
  planType: PlanType
  name: string
  durationDays: number
  maxParticipants: number
  roomsPerMonth: number | null
  subscriptionPlan: {
    id: string
    name: string
    monthlyPrice: number
    yearlyPrice: number
    appScope: string
  }
}

type MahaSubscription = {
  id: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
  metadata: Record<string, any> | null
}

interface Props {
  userId: string
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

export function MahaLilahSubscriptionManager({ userId }: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<MahaPlan[]>([])
  const [activeSubscription, setActiveSubscription] = useState<MahaSubscription | null>(null)
  const [history, setHistory] = useState<MahaSubscription[]>([])
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('SUBSCRIPTION')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY')
  const [durationDays, setDurationDays] = useState<number>(30)

  const selectedPlan = useMemo(
    () => plans.find((item) => item.planType === selectedPlanType) || null,
    [plans, selectedPlanType]
  )

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/mahalilah-subscription`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar assinatura Maha Lilah')
      }

      const nextPlans: MahaPlan[] = Array.isArray(data.plans) ? data.plans : []
      setPlans(nextPlans)
      setActiveSubscription((data.activeSubscription || null) as MahaSubscription | null)
      setHistory(Array.isArray(data.subscriptions) ? data.subscriptions : [])

      if (nextPlans.length > 0) {
        const keepCurrent = nextPlans.some((item) => item.planType === selectedPlanType)
        const fallbackType = keepCurrent ? selectedPlanType : nextPlans[0].planType
        setSelectedPlanType(fallbackType)
        const fallbackPlan = nextPlans.find((item) => item.planType === fallbackType) || nextPlans[0]
        setDurationDays(fallbackPlan?.durationDays || 30)
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura Maha Lilah:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar assinatura Maha Lilah')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (selectedPlan?.durationDays) {
      setDurationDays(selectedPlan.durationDays)
    }
  }, [selectedPlan?.id])

  const handleGrant = async () => {
    if (!selectedPlan) {
      toast.error('Nenhum plano Maha Lilah disponível.')
      return
    }

    if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3650) {
      toast.error('Duração deve estar entre 1 e 3650 dias.')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/admin/users/${userId}/mahalilah-subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan.planType,
          billingInterval,
          durationDays
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conceder assinatura Maha Lilah')
      }

      toast.success('Assinatura Maha Lilah concedida com sucesso.')
      await loadData()
    } catch (error) {
      console.error('Erro ao conceder assinatura Maha Lilah:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao conceder assinatura Maha Lilah')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Deseja revogar a assinatura Maha Lilah ativa deste usuário?')) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/admin/users/${userId}/mahalilah-subscription`, {
        method: 'DELETE'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao revogar assinatura Maha Lilah')
      }

      toast.success('Assinatura Maha Lilah revogada com sucesso.')
      await loadData()
    } catch (error) {
      console.error('Erro ao revogar assinatura Maha Lilah:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar assinatura Maha Lilah')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glass rounded-lg border border-hekate-gold/20 p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-hekate-pearl">Maha Lilah (Cortesia/Admin)</h3>
        <p className="text-sm text-hekate-pearl/60">
          Conceda ou revogue assinatura de Maha Lilah sem checkout.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-hekate-pearl/60">Carregando assinatura Maha Lilah...</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-hekate-gold/20 bg-card p-4">
            <div className="text-sm text-hekate-pearl/60 mb-2">Status atual</div>
            {activeSubscription ? (
              <div className="space-y-1 text-sm text-hekate-pearl">
                <div><strong>Status:</strong> {activeSubscription.status}</div>
                <div><strong>Início:</strong> {formatDate(activeSubscription.currentPeriodStart)}</div>
                <div><strong>Fim:</strong> {formatDate(activeSubscription.currentPeriodEnd)}</div>
              </div>
            ) : (
              <div className="text-sm text-hekate-pearl/70">Sem assinatura Maha Lilah ativa.</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-hekate-pearl/80">Plano Maha Lilah</label>
              <select
                className="w-full rounded-md border border-hekate-gold/30 bg-background px-3 py-2 text-sm text-hekate-pearl"
                value={selectedPlanType}
                onChange={(event) => setSelectedPlanType(event.target.value as PlanType)}
                disabled={submitting || plans.length === 0}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.planType}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-hekate-pearl/80">Ciclo</label>
              <select
                className="w-full rounded-md border border-hekate-gold/30 bg-background px-3 py-2 text-sm text-hekate-pearl"
                value={billingInterval}
                onChange={(event) => setBillingInterval(event.target.value as BillingInterval)}
                disabled={submitting}
              >
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-hekate-pearl/80">Duração (dias)</label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value))}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-hekate-pearl/80">Ações</label>
              <div className="flex gap-2">
                <Button onClick={handleGrant} disabled={submitting || plans.length === 0}>
                  Conceder
                </Button>
                <Button variant="destructive" onClick={handleRevoke} disabled={submitting || !activeSubscription}>
                  Revogar
                </Button>
              </div>
            </div>
          </div>

          {selectedPlan ? (
            <div className="rounded-lg border border-hekate-gold/20 bg-card p-4 text-sm text-hekate-pearl/80">
              <div><strong>Participantes:</strong> até {selectedPlan.maxParticipants}</div>
              <div>
                <strong>Limite de salas:</strong>{' '}
                {selectedPlan.roomsPerMonth == null ? 'Ilimitado' : `${selectedPlan.roomsPerMonth} por mês`}
              </div>
              <div>
                <strong>Plano de cobrança vinculado:</strong> {selectedPlan.subscriptionPlan.name}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-hekate-gold/20 bg-card p-4">
            <div className="text-sm font-medium text-hekate-pearl mb-3">Histórico Maha Lilah</div>
            {history.length === 0 ? (
              <div className="text-sm text-hekate-pearl/60">Sem registros de assinatura Maha Lilah.</div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-md border border-hekate-gold/20 px-3 py-2 text-sm text-hekate-pearl/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>ID {item.id.slice(-8)}</span>
                      <span>{item.status}</span>
                    </div>
                    <div className="text-xs text-hekate-pearl/60">
                      {formatDate(item.currentPeriodStart)} até {formatDate(item.currentPeriodEnd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
