'use client'

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
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard"><button>Ir para o dashboard</button></Link>
            <Link href="/checkout"><button className="secondary">Voltar ao checkout</button></Link>
          </div>
        </div>
      </section>
    </main>
  )
}
