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
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border/70 bg-surface/70 p-6">
            <h3 className="font-serif text-xl text-ink">{item.title}</h3>
            <p className="mt-3 text-sm text-ink-muted">{item.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
