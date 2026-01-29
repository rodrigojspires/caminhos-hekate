'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

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
  const { data: session, status } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)
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
          {status === 'loading' ? (
            <div className="h-10 w-10 animate-pulse rounded-full border border-border/70 bg-surface/70" />
          ) : session ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-gold/60"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-[#0f141f] text-xs font-bold text-gold">
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
                    <p className="text-xs text-ink-muted truncate">{session.user?.email}</p>
                  </div>
                  <div className="my-2 h-px bg-border/70" />
                  <Link
                    href="/dashboard"
                    className="block rounded-xl px-3 py-2 text-ink-muted transition hover:bg-surface-2 hover:text-ink"
                    onClick={() => setProfileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-ink-muted transition hover:bg-surface-2 hover:text-ink"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-ghost">
              Entrar
            </Link>
          )}
          {session ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <Link href="/planos" className="btn-primary">
              Ver planos
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
