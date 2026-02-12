import Link from 'next/link'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type FaqItem = {
  question: string
  answer: string
}

export function FAQ({
  eyebrow,
  title,
  subtitle,
  items,
  ctaLabel,
  ctaHref
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  items: FaqItem[]
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-4">
        {items.map((item, index) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-border/70 bg-surface/70 p-5 shadow-soft transition hover:border-gold/30"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg text-ink">
              <span>{item.question}</span>
              <span className="text-gold transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 pr-8 text-sm text-ink-muted">{item.answer}</p>
          </details>
        ))}
      </div>
      {ctaHref && ctaLabel && (
        <div>
          <Link href={ctaHref} className="btn-ghost">
            {ctaLabel}
          </Link>
        </div>
      )}
    </SectionShell>
  )
}
