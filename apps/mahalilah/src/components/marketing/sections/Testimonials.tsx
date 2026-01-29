import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type Testimonial = {
  quote: string
  name: string
  role: string
}

export function Testimonials({
  eyebrow,
  title,
  subtitle,
  items
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  items: Testimonial[]
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <figure key={item.name} className="rounded-3xl border border-border/70 bg-surface/70 p-6">
            <blockquote className="text-base text-ink">“{item.quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-ink-muted">
              <span className="text-ink">{item.name}</span> · {item.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  )
}
