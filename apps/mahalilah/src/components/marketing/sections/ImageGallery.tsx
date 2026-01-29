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
          <MediaPlaceholder
            key={item.label}
            variant={item.variant ?? 'horizontal'}
            label={item.label}
          />
        ))}
      </div>
    </SectionShell>
  )
}
