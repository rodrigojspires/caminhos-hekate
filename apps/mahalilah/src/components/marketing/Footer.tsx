import Link from 'next/link'

const columns = [
  {
    title: 'Produto',
    links: [
      { href: '/como-funciona', label: 'Como funciona' },
      { href: '/planos', label: 'Planos e limites' },
      { href: '/para-terapeutas', label: 'Para terapeutas' },
      { href: '/para-grupos', label: 'Para grupos' },
      { href: '/dashboard', label: 'Dashboard (login)' }
    ]
  },
  {
    title: 'Recursos',
    links: [
      { href: '/recursos', label: 'Visão geral' },
      { href: '/recursos#deck', label: 'Deck randômico' },
      { href: '/recursos#modo-terapia', label: 'Modo terapia' },
      { href: '/recursos#ia', label: 'IA e síntese' }
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
  },
  {
    title: 'Contato',
    links: [
      { href: '/contato', label: 'Fale com a gente' },
      { href: 'https://wa.me/00000000000', label: 'WhatsApp (placeholder)' },
      { href: 'https://instagram.com/mahalilahonline', label: 'Instagram (placeholder)' }
    ]
  }
]

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-[#0b0e13]/90">
      <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,_1fr)]">
          <div className="flex flex-col gap-4">
            <span className="font-serif text-2xl text-ink">Maha Lilah Online</span>
            <p className="text-sm text-ink-muted">
              Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.
              Profissional, acolhedor e sem promessas milagrosas.
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <span>Mercado Pago</span>
              <span>Login obrigatório</span>
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
            Maha Lilah Online é uma plataforma de apoio terapêutico. Não substitui terapia, atendimento
            médico ou emergência. Resultados variam conforme contexto e condução.
          </p>
          <p>© 2026 Maha Lilah Online. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
