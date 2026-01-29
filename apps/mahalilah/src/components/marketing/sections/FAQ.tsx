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
        {items.map((item) => (
          <div key={item.question} className="rounded-2xl border border-border/70 bg-surface/70 p-5">
            <h3 className="font-serif text-lg text-ink">{item.question}</h3>
            <p className="mt-2 text-sm text-ink-muted">{item.answer}</p>
          </div>
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
