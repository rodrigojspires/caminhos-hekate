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
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
        <MediaPlaceholder variant="video" label={mediaLabel} />
      </div>
    </SectionShell>
  )
}
