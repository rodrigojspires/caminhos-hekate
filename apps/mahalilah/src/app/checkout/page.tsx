'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CheckoutStatusPage() {
  const params = useSearchParams()
  const status = params.get('status')

  const message = status === 'success'
    ? 'Pagamento aprovado! Você já pode criar sua sala.'
    : status === 'pending'
      ? 'Pagamento pendente. Assim que confirmar, liberaremos o acesso.'
      : status === 'failure'
        ? 'Pagamento não aprovado. Tente novamente.'
        : 'Status do pagamento não informado.'

  return (
    <main>
      <section className="grid" style={{ gap: 20 }}>
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Checkout Maha Lilah</h1>
          <p>{message}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard"><button>Ir para o dashboard</button></Link>
            <Link href="/pricing"><button className="secondary">Ver planos</button></Link>
          </div>
        </div>
      </section>
    </main>
  )
}
