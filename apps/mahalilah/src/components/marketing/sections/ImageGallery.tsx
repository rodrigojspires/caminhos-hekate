import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type GalleryItem = {
  label: string
  variant?: 'horizontal' | 'vertical'
}

export function ImageGallery({
  eyebrow,
  title,
  subtitle,
  items
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  items: GalleryItem[]
}) {
  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="overflow-hidden rounded-3xl border border-border/70 bg-surface/40 p-1">
            <MediaPlaceholder variant={item.variant ?? 'horizontal'} label={item.label} />
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
