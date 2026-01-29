import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { PricingClient } from '@/components/mahalilah/PricingClient'

export default async function PricingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/pricing')}`)
  }

  return (
    <main>
      <section className="grid" style={{ gap: 20 }}>
        <header>
          <div className="badge">Planos Maha Lilah</div>
          <h1 style={{ marginTop: 8 }}>Escolha seu acesso</h1>
          <p className="small-muted">Todos os participantes precisam estar logados para jogar.</p>
        </header>
        <PricingClient />
      </section>
    </main>
  )
}
