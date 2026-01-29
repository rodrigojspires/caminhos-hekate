import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <section className="grid two" style={{ alignItems: 'center' }}>
        <div>
          <div className="badge">Maha Lilah Online</div>
          <h1 style={{ fontSize: 44, margin: '16px 0 12px' }}>Tabuleiro terapêutico em tempo real.</h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1.6 }}>
            Crie salas privadas, convide participantes com login obrigatório e acompanhe o jogo com foco terapêutico.
            Tudo integrado ao mesmo ecossistema do Caminhos de Hekate.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <Link href="/login" style={{ display: 'inline-flex' }}>
              <button>Entrar</button>
            </Link>
            <Link href="/pricing" style={{ display: 'inline-flex' }}>
              <button className="secondary">Ver planos</button>
            </Link>
            <Link href="/dashboard" style={{ display: 'inline-flex' }}>
              <button className="secondary">Painel do terapeuta</button>
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Fluxo rápido</h2>
          <ol style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            <li>Faça login com sua conta do Caminhos de Hekate.</li>
            <li>Crie uma sala e convide jogadores por e-mail.</li>
            <li>Cada convite gera um link único com login obrigatório.</li>
            <li>Todos entram com segurança no mesmo tabuleiro.</li>
          </ol>
        </div>
      </section>
    </main>
  )
}
