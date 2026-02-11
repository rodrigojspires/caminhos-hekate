import { LinkButton, SectionShell } from '@/components/marketing/ui'
import type { Cta } from '@/components/marketing/ui'

export function CTA({
  title,
  subtitle,
  primaryCta,
  secondaryCta
}: {
  title: string
  subtitle: string
  primaryCta: Cta
  secondaryCta?: Cta
}) {
  return (
    <SectionShell className="pb-16 sm:pb-18 lg:pb-20">
      <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 shadow-soft sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">{title}</h2>
            <p className="max-w-2xl text-sm text-ink-muted sm:text-base">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton cta={primaryCta} variant="primary" />
            {secondaryCta && <LinkButton cta={secondaryCta} variant="secondary" />}
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
