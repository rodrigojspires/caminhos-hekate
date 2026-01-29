import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/planos', label: 'Planos' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/para-terapeutas', label: 'Para terapeutas' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/contato', label: 'Contato' }
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-[#0b0e13]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-6 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 bg-surface text-gold">
              ML
            </div>
            <div>
              <p className="font-serif text-lg text-ink">Maha Lilah Online</p>
              <p className="text-xs uppercase tracking-[0.28em] text-ink-muted">SaaS terapêutico</p>
            </div>
          </Link>
        </div>
        <nav aria-label="Navegação principal" className="flex flex-wrap gap-4 text-sm text-ink-muted">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/planos" className="btn-primary">
            Ver planos
          </Link>
        </div>
      </div>
    </header>
  )
}
