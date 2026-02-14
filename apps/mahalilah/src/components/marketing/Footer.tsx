import Link from 'next/link'

const columns = [
  {
    title: 'Produto',
    links: [
      { href: '/como-funciona', label: 'Como funciona' },
      { href: '/planos', label: 'Planos e limites' },
      { href: '/recursos', label: 'Recursos da sala' },
      { href: '/dashboard', label: 'Dashboard' }
    ]
  },
  {
    title: 'Soluções',
    links: [
      { href: '/para-terapeutas', label: 'Para terapeutas' },
      { href: '/para-grupos', label: 'Para grupos' }
    ]
  },
  {
    title: 'Suporte',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/contato', label: 'Falar com a equipe' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/cookies', label: 'Cookies' },
      { href: '/politica-de-reembolso', label: 'Política de reembolso' }
    ]
  }
]

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-[linear-gradient(180deg,rgba(9,13,21,0.8),rgba(7,10,16,0.96))]">
      <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="rounded-3xl border border-gold/25 bg-surface/60 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-soft">Pronto para começar?</p>
              <h2 className="font-serif text-2xl text-ink sm:text-3xl">
                  Crie sua primeira sala (ou comece autoguiado)
              </h2>
              Veja a experiência real no tabuleiro — com registro e assistência de IA opcional.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/planos" className="btn-primary">
                Ver planos
              </Link>
              <Link href="/contato" className="btn-secondary">
                Falar com especialista
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,_1fr)]">
          <div className="flex flex-col gap-4">
            <span className="font-serif text-2xl text-ink">Maha Lilah Online</span>
            <p className="text-sm text-ink-muted">
              Plataforma para jornadas terapêuticas ao vivo com registro, deck randômico e síntese assistida por IA.
              Experiência acolhedora, organizada e segura.
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <span>Mercado Pago</span>
              <span>Consentimento registrado</span>
              <span>Tempo real</span>
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-ink">{column.title}</span>
              <div className="flex flex-col gap-2 text-sm text-ink-muted">
                {column.links.map((link) => (
                  <Link key={link.href} href={link.href} className="transition hover:text-ink">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 pt-6 text-xs text-ink-muted">
          <p>
            Maha Lilah Online é uma plataforma de apoio terapêutico. Não substitui terapia, atendimento médico
            ou emergência. Resultados variam conforme contexto e condução.
          </p>
          <p>© 2026 Maha Lilah Online. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
