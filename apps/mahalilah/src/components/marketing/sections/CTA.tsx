import { LinkButton, SectionShell } from '@/components/marketing/ui'
import type { Cta } from '@/components/marketing/ui'

export function CTA({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  badges
}: {
  title: string
  subtitle: string
  primaryCta?: Cta
  secondaryCta?: Cta
  badges?: string[]
}) {
  return (
    <SectionShell className="pb-16 sm:pb-16 lg:pb-20">
      <div className="rounded-3xl border border-gold/25 bg-[linear-gradient(140deg,rgba(23,33,52,0.94),rgba(15,23,36,0.94))] p-6 shadow-soft sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">{title}</h2>
            <p className="max-w-2xl text-sm text-ink-muted sm:text-base">{subtitle}</p>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-border/80 bg-surface/75 px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {primaryCta && <LinkButton cta={primaryCta} variant="primary" />}
            {secondaryCta && <LinkButton cta={secondaryCta} variant="secondary" />}
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
