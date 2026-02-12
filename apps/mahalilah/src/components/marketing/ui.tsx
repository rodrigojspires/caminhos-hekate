import Link from 'next/link'
import type { ReactNode } from 'react'

export type Cta = {
  label: string
  href: string
}

export function SectionShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20 ${className}`}>
      <div className="mx-auto flex w-full max-w-content flex-col gap-10 lg:gap-12">
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
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-surface/90 px-3 py-1 text-xs uppercase tracking-[0.24em] text-gold-soft shadow-[0_0_0_1px_rgba(255,199,93,0.1)_inset]">
          {eyebrow}
        </span>
      )}
      <h2 className="font-serif text-2xl leading-tight text-ink sm:text-3xl lg:text-4xl">{title}</h2>
      {subtitle && <p className="max-w-3xl text-sm text-ink-muted sm:text-base lg:text-lg">{subtitle}</p>}
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
    <Link
      href={cta.href}
      className={`${styles[variant]} gap-2`}
      data-analytics-role="cta"
      data-analytics-label={cta.label}
    >
      <span>{cta.label}</span>
      {variant === 'primary' ? <span aria-hidden>→</span> : null}
    </Link>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
      {children}
    </span>
  )
}
