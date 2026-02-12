'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/planos', label: 'Planos' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/para-terapeutas', label: 'Terapeutas' },
  { href: '/para-grupos', label: 'Grupos' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contato', label: 'Contato' }
]

const isLinkActive = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const profileMenuItemClass =
    'flex w-full items-center rounded-xl px-3 py-2 text-left text-ink-muted transition hover:bg-surface-2 hover:text-ink'
  const neutralButtonStyle = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: 'var(--ink)',
    filter: 'none'
  } as const
  const neutralMenuItemStyle = {
    background: 'transparent',
    borderColor: 'transparent',
    boxShadow: 'none',
    color: 'var(--ink-muted)',
    filter: 'none'
  } as const
  const profileInitial = useMemo(() => {
    const label = session?.user?.name || session?.user?.email || 'U'
    const trimmed = label.trim()
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'U'
  }, [session?.user?.email, session?.user?.name])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) return
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  useEffect(() => {
    if (!session) setProfileOpen(false)
  }, [session])

  useEffect(() => {
    setMobileMenuOpen(false)
    setProfileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[linear-gradient(180deg,rgba(10,15,24,0.95),rgba(10,15,24,0.84))] backdrop-blur">
      <div className="hidden border-b border-border/50 px-4 py-2 text-center text-xs uppercase tracking-[0.18em] text-gold-soft sm:block">
        Experimente o fluxo ao vivo e publique sua primeira sala em menos de 5 minutos
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 bg-surface text-gold">
              ML
            </div>
            <div>
              <p className="font-serif text-lg text-ink">Maha Lilah Online</p>
              <p className="text-xs uppercase tracking-[0.28em] text-ink-muted">Jornadas ao vivo</p>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Navegação principal"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm text-ink-muted lg:flex"
        >
          {navLinks.map((link) => {
            const active = isLinkActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-2.5 py-1.5 transition ${
                  active
                    ? 'border border-gold/35 bg-surface/85 text-ink'
                    : 'border border-transparent text-ink-muted hover:border-border/70 hover:bg-surface/65 hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {status === 'loading' ? (
            <div className="h-10 w-10 animate-pulse rounded-full border border-border/70 bg-surface/70" />
          ) : session ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex items-center justify-center rounded-full p-0 text-sm font-semibold text-ink transition"
                style={neutralButtonStyle}
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold"
                  style={{ background: '#0f141f', borderColor: 'var(--border)', color: 'var(--ink)' }}
                >
                  {profileInitial}
                </span>
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/70 bg-surface p-2 text-sm shadow-soft"
                  role="menu"
                >
                  <div className="px-3 py-2">
                    <p className="font-semibold text-ink">{session.user?.name || 'Perfil'}</p>
                    <p className="truncate text-xs text-ink-muted">{session.user?.email}</p>
                  </div>
                  <div className="my-2 h-px bg-border/70" />
                  <Link
                    href="/dashboard"
                    className={profileMenuItemClass}
                    style={neutralMenuItemStyle}
                    onClick={() => setProfileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/faturas"
                    className={profileMenuItemClass}
                    style={neutralMenuItemStyle}
                    onClick={() => setProfileOpen(false)}
                  >
                    Faturas
                  </Link>
                  <button
                    type="button"
                    className={profileMenuItemClass}
                    style={neutralMenuItemStyle}
                    onClick={() => {
                      setProfileOpen(false)
                      void signOut({ callbackUrl: '/' })
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                Ver demo
              </Link>
            </>
          )}
          {session ? (
            <Link href="/dashboard" className="btn-primary">
              Ir para dashboard
            </Link>
          ) : (
            <Link href="/planos" className="btn-primary">
              Começar agora
            </Link>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? 'Fechar' : 'Menu'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border/60 bg-[#0b0e13]/95 px-4 pb-5 pt-4 sm:px-6 lg:hidden"
        >
          <nav aria-label="Navegação principal mobile" className="grid gap-1">
            {navLinks.map((link) => {
              const active = isLinkActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-gold/35 bg-surface/80 text-ink'
                      : 'border-transparent text-ink-muted hover:border-border/60 hover:bg-surface/70 hover:text-ink'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 border-t border-border/60 pt-4">
            {status === 'loading' ? (
              <div className="h-10 w-full animate-pulse rounded-xl border border-border/70 bg-surface/70" />
            ) : session ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-border/70 bg-surface/70 px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{session.user?.name || 'Perfil'}</p>
                  <p className="truncate text-xs text-ink-muted">{session.user?.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="btn-primary w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/faturas"
                  className="btn-secondary w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Faturas
                </Link>
                <button
                  type="button"
                  className="btn-secondary w-full justify-center"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    void signOut({ callbackUrl: '/' })
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href="/login"
                  className="btn-ghost w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-secondary w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Ver demo
                </Link>
                <Link
                  href="/planos"
                  className="btn-primary w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Começar agora
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
