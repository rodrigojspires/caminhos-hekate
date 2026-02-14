import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { LinkButton, SectionShell } from '@/components/marketing/ui'
import type { Cta } from '@/components/marketing/ui'

export type HeroMetric = {
  value: string
  label: string
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  mediaLabel,
  note,
  highlights,
  metrics
}: {
  eyebrow?: string
  title: string
  subtitle: string
  primaryCta: Cta
  secondaryCta?: Cta
  mediaLabel?: string
  note?: string
  highlights?: string[]
  metrics?: HeroMetric[]
}) {
  const hasMedia = Boolean(mediaLabel?.trim())

  return (
    <SectionShell className="pt-12 sm:pt-14 lg:pt-20">
      <div className={hasMedia ? 'grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]' : 'grid items-center gap-12'}>
        <div className="flex flex-col gap-6">
          {eyebrow && (
            <span className="inline-flex w-fit items-center rounded-full border border-gold/35 bg-surface/90 px-3 py-1 text-xs uppercase tracking-[0.26em] text-gold-soft">
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-6xl">{title}</h1>
          <div className="flex flex-wrap gap-3">
            <LinkButton cta={primaryCta} variant="primary" />
            {secondaryCta && <LinkButton cta={secondaryCta} variant="secondary" />}
          </div>
          <p className="max-w-3xl text-sm text-ink-muted sm:text-base lg:text-lg">{subtitle}</p>
          {highlights && highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/80 bg-surface/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          )}          
          {note && <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{note}</p>}
          {metrics && metrics.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-border/80 bg-surface/70 px-4 py-3 shadow-[0_10px_24px_rgba(6,10,18,0.3)]"
                >
                  <p className="font-serif text-2xl text-gold">{metric.value}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{metric.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {hasMedia && (
          <MediaPlaceholder variant="video" label={mediaLabel}>
            <span className="rounded-full border border-gold/35 bg-surface/85 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold-soft">
              Prévia da experiência real
            </span>
          </MediaPlaceholder>
        )}
      </div>
    </SectionShell>
  )
}
