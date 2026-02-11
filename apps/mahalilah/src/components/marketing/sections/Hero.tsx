import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { LinkButton, SectionShell } from '@/components/marketing/ui'
import type { Cta } from '@/components/marketing/ui'

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  mediaLabel,
  note
}: {
  eyebrow?: string
  title: string
  subtitle: string
  primaryCta: Cta
  secondaryCta?: Cta
  mediaLabel: string
  note?: string
}) {
  return (
    <SectionShell className="pt-14 sm:pt-16 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          {eyebrow && (
            <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-surface px-3 py-1 text-xs uppercase tracking-[0.26em] text-gold-soft">
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="text-sm text-ink-muted sm:text-base lg:text-lg">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton cta={primaryCta} variant="primary" />
            {secondaryCta && <LinkButton cta={secondaryCta} variant="secondary" />}
          </div>
          {note && <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{note}</p>}
        </div>
        <MediaPlaceholder variant="video" label={mediaLabel} />
      </div>
    </SectionShell>
  )
}
