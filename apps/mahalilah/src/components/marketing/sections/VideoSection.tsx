import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export function VideoSection({
  eyebrow,
  title,
  subtitle,
  bullets,
  mediaLabel
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  bullets?: string[]
  mediaLabel: string
}) {
  return (
    <SectionShell>
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
          {bullets && (
            <ul className="space-y-3 text-sm text-ink-muted">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <MediaPlaceholder variant="video" label={mediaLabel} />
      </div>
    </SectionShell>
  )
}
