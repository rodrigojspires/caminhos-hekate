import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export function VideoSection({
  eyebrow,
  title,
  subtitle,
  bullets,
  mediaLabel,
  videoSrc,
  videoType,
  videoFallbackSrc,
  videoFallbackType
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  bullets?: string[]
  mediaLabel: string
  videoSrc?: string
  videoType?: string
  videoFallbackSrc?: string
  videoFallbackType?: string
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
        {videoSrc ? (
          <div className="relative w-full overflow-hidden rounded-3xl border border-border/70 bg-surface/85 shadow-soft">
            <video
              aria-label={mediaLabel}
              className="aspect-[16/9] w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              controls
            >
              <source src={videoSrc} type={videoType || undefined} />
              {videoFallbackSrc && <source src={videoFallbackSrc} type={videoFallbackType || undefined} />}
            </video>
            <div className="border-t border-border/70 bg-surface/90 px-4 py-2 text-xs text-ink-muted">
              O vídeo inicia sem som. Use o controle de áudio do player para ativar quando quiser.
            </div>
          </div>
        ) : (
          <MediaPlaceholder variant="video" label={mediaLabel} />
        )}
      </div>
    </SectionShell>
  )
}
