'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PricingClient } from '@/components/mahalilah/PricingClient'

const STATUS_MESSAGES: Record<string, string> = {
  success: 'Pagamento aprovado! Você já pode criar sua sala.',
  pending: 'Pagamento pendente. Assim que confirmar, liberaremos o acesso.',
  failure: 'Pagamento não aprovado. Tente novamente.'
}

export default function CheckoutStatusPage() {
  const params = useSearchParams()
  const status = params.get('status')
  const orderId = params.get('order')
  const paymentId = params.get('payment_id') || params.get('paymentId') || undefined
  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [createdRoom, setCreatedRoom] = useState<{ id: string; code: string } | null>(null)

  const shouldFinalizeSingleSession = useMemo(
    () => status === 'success' && Boolean(orderId),
    [status, orderId]
  )

  useEffect(() => {
    if (!shouldFinalizeSingleSession || !orderId) return
    let cancelled = false

    const finalize = async () => {
      setFinalizeLoading(true)
      setFinalizeError(null)

      const response = await fetch('/api/mahalilah/checkout/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentId
        })
      })

      const payload = await response.json().catch(() => ({}))
      if (cancelled) return

      if (!response.ok) {
        setFinalizeError(
          payload?.error || 'Pagamento recebido, mas ainda estamos finalizando sua sala.'
        )
        setFinalizeLoading(false)
        return
      }

      if (payload?.room?.id && payload?.room?.code) {
        setCreatedRoom({
          id: payload.room.id,
          code: payload.room.code
        })
      }

      setFinalizeLoading(false)
    }

    void finalize()

    return () => {
      cancelled = true
    }
  }, [shouldFinalizeSingleSession, orderId, paymentId])

  if (!status) {
    return (
      <main>
        <section className="grid" style={{ gap: 20 }}>
          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <h1 style={{ margin: 0 }}>Checkout Maha Lilah</h1>
            <p className="small-muted">
              Escolha o plano e avance para o pagamento seguro via Mercado Pago.
            </p>
          </div>
          <PricingClient />
        </section>
      </main>
    )
  }

  const message = STATUS_MESSAGES[status] || 'Status do pagamento inválido.'

  return (
    <main>
      <section className="grid" style={{ gap: 20 }}>
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Checkout Maha Lilah</h1>
          <p>{message}</p>
          {shouldFinalizeSingleSession && (
            <div className="small-muted" style={{ display: 'grid', gap: 8 }}>
              {finalizeLoading && <span>Finalizando sua sala automática...</span>}
              {finalizeError && <span>{finalizeError}</span>}
              {createdRoom && (
                <span>
                  Sala criada automaticamente: <strong>{createdRoom.code}</strong>
                </span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard"><button>Ir para o dashboard</button></Link>
            {createdRoom && (
              <Link href={`/rooms/${createdRoom.code}`}>
                <button className="secondary">Abrir sala {createdRoom.code}</button>
              </Link>
            )}
            <Link href="/checkout"><button className="secondary">Voltar ao checkout</button></Link>
          </div>
        </div>
      </section>
    </main>
  )
}
