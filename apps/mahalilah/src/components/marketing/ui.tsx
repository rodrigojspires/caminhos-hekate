import Link from 'next/link'
import type { ReactNode } from 'react'

export type Cta = {
  label: string
  href: string
}

export function SectionShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16 ${className}`}>
      <div className="mx-auto flex w-full max-w-content flex-col gap-10">
        {children}
      </div>
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left'
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  return (
    <header className={`flex flex-col gap-4 ${alignment}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold-soft">
          {eyebrow}
        </span>
      )}
      <h2 className="font-serif text-2xl text-ink sm:text-3xl lg:text-4xl">{title}</h2>
      {subtitle && <p className="max-w-2xl text-sm text-ink-muted sm:text-base lg:text-lg">{subtitle}</p>}
    </header>
  )
}

export function LinkButton({ cta, variant = 'primary' }: { cta: Cta; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost'
  }

  return (
    <Link href={cta.href} className={styles[variant]}>
      {cta.label}
    </Link>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
      {children}
    </span>
  )
}
