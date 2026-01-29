import type { ReactNode } from 'react'
import { LinkButton, SectionHeader, SectionShell } from '@/components/marketing/ui'
import type { Cta } from '@/components/marketing/ui'

export type PricingPlan = {
  name: string
  price: string | ReactNode
  description: string
  forWho: string
  includes: string[]
  limits: string[]
  cta: Cta
  highlight?: boolean
}

export function PricingCards({
  eyebrow,
  title,
  subtitle,
  plans
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  plans: PricingPlan[]
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex h-full flex-col gap-6 rounded-3xl border ${
              plan.highlight ? 'border-gold/70 bg-surface' : 'border-border/70 bg-surface/70'
            } p-8 shadow-soft`}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-ink-muted">{plan.name}</span>
              {typeof plan.price === 'string' ? (
                <h3 className="font-serif text-3xl text-ink">{plan.price}</h3>
              ) : (
                <div className="flex flex-col gap-3">
                  {plan.price}
                </div>
              )}
              <p className="text-sm text-ink-muted">{plan.description}</p>
            </div>
            <div className="space-y-2 text-sm text-ink-muted">
              <p>
                <span className="text-ink">Para quem:</span> {plan.forWho}
              </p>
              <div>
                <span className="text-ink">Inclui:</span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {plan.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-ink">Limites:</span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {plan.limits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-auto">
              <LinkButton cta={plan.cta} variant={plan.highlight ? 'primary' : 'secondary'} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
