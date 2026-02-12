import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type FeatureItem = {
  title: string
  description: string
}

export function Features({
  eyebrow,
  title,
  subtitle,
  items
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  items: FeatureItem[]
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="group rounded-3xl border border-border/70 bg-surface/70 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-gold/35 hover:bg-surface sm:p-6"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-surface-2 text-xs font-semibold text-gold">
              {index + 1}
            </div>
            <h3 className="mt-4 font-serif text-xl text-ink">{item.title}</h3>
            <p className="mt-3 text-sm text-ink-muted">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  )
}
