'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type Payment = {
  id: string
  amount: number
  status: string
  paymentMethod?: string
  provider?: string
  description?: string
  lineItems?: Array<{ label: string; amount: number }>
  invoiceUrl?: string
  receiptUrl?: string
  createdAt: string
  paidAt?: string
  subscription?: { id: string; plan?: { name?: string } }
}

export default function MinhasFaturasPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [payingId, setPayingId] = useState<string | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/history?page=${p}&limit=20`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setPayments(data.payments || [])
        setPage(data.page || 1)
        setTotalPages(data.totalPages || 1)
      } else {
        toast.error(data?.error || 'Falha ao carregar faturas')
      }
    } catch (e) {
      toast.error('Falha ao carregar faturas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  const canPay = (p: Payment) => p.status === 'PENDING' && (!!p.subscription?.id || !!p.lineItems?.length)

  const handlePay = useCallback(async (p: Payment) => {
    setPayingId(p.id)
    try {
      const res = p.subscription?.id
        ? await fetch(`/api/payments/subscriptions/${p.subscription.id}/invoice`, { method: 'POST' })
        : await fetch(`/api/payments/invoice/${p.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar cobrança')
      const url = data.paymentUrl as string | undefined
      if (url) {
        window.open(url, '_blank')
      } else {
        toast.info('Cobrança gerada. Consulte detalhes na sua lista de faturas.')
      }
      // Reload to reflect any new transaction linkage
      load(page)
    } catch (e) {
      toast.error('Erro ao iniciar pagamento')
    } finally {
      setPayingId(null)
    }
  }, [load, page])

  const rows = useMemo(() => payments.map(p => (
    <div key={p.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center py-3">
      <div className="text-sm">
        <div className="font-medium">{p.subscription?.plan?.name || p.description || 'Assinatura'}</div>
        <div className="text-muted-foreground">#{p.id.slice(0,8)} • {new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
        {p.lineItems && p.lineItems.length > 0 && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {p.lineItems.map((item, index) => (
              <div key={`${p.id}-item-${index}`} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span>R$ {item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="md:text-center">R$ {p.amount.toFixed(2)}</div>
      <div className="md:text-center">{p.status}</div>
      <div className="md:text-center">{p.paymentMethod || '-'}</div>
      <div className="md:text-center flex gap-2">
        {p.invoiceUrl && <Button variant="outline" size="sm" onClick={() => window.open(p.invoiceUrl, '_blank')}>Boleto</Button>}
        {p.receiptUrl && <Button variant="outline" size="sm" onClick={() => window.open(p.receiptUrl, '_blank')}>Recibo</Button>}
      </div>
      <div className="md:text-right">
        {canPay(p) && (
          <Button size="sm" onClick={() => handlePay(p)} disabled={payingId === p.id}>
            {payingId === p.id ? 'Gerando…' : 'Pagar'}
          </Button>
        )}
      </div>
      <Separator className="md:col-span-6" />
    </div>
  )), [payments, payingId, handlePay])

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Minhas Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando…</div>
          ) : payments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhuma fatura encontrada.</div>
          ) : (
            <div className="divide-y">
              {rows}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Anterior</Button>
            <div className="text-sm">Página {page} de {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => load(page + 1)}>Próxima</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
