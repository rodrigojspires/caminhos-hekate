import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type Testimonial = {
  quote: string
  name: string
  title?: string
  role?: string
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
          <figure
            key={item.name}
            className="rounded-3xl border border-border/70 bg-surface/75 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-gold/35 sm:p-6"
          >
            {item.title?.trim() ? (
              <div className="mb-3 inline-flex rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold">
                {item.title.trim()}
              </div>
            ) : null}
            <div className="mb-3 flex text-sm tracking-[0.14em] text-gold">★★★★★</div>
            <blockquote className="text-sm text-ink sm:text-base">“{item.quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-ink-muted">
              <span className="text-ink">{item.name}</span>
              {item.role?.trim() ? ` · ${item.role.trim()}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  )
}
