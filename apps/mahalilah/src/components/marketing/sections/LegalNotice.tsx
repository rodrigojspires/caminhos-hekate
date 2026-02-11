import { SectionShell } from '@/components/marketing/ui'

export function LegalNotice({ items }: { items: string[] }) {
  return (
    <SectionShell className="pt-10">
      <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 sm:p-6">
        <h3 className="font-serif text-xl text-ink">Avisos importantes</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
