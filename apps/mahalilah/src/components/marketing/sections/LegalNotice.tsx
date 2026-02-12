import { SectionShell } from '@/components/marketing/ui'

export function LegalNotice({ items }: { items: string[] }) {
  return (
    <SectionShell className="pt-10">
      <div className="rounded-3xl border border-gold/30 bg-[linear-gradient(150deg,rgba(24,34,52,0.93),rgba(14,22,34,0.96))] p-5 sm:p-6">
        <h3 className="font-serif text-xl text-ink">Avisos importantes</h3>
        <ul className="mt-4 space-y-3 text-sm text-ink-muted">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold/80" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
