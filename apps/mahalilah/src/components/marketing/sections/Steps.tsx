import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type StepItem = {
  title: string
  description: string
}

export function Steps({
  eyebrow,
  title,
  subtitle,
  steps
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  steps: StepItem[]
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-border/70 bg-surface/70 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 bg-surface text-sm font-semibold text-gold">
              {index + 1}
            </div>
            <h3 className="mt-4 font-serif text-xl text-ink">{step.title}</h3>
            <p className="mt-3 text-sm text-ink-muted">{step.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
