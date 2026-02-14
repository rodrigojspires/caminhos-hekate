'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export type GalleryItem = {
  label: string
  variant?: 'horizontal' | 'vertical'
  description?: string
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
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const safeItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        description:
          item.description ||
          'Fluxo pensado para reduzir fricção, sustentar presença e facilitar continuidade terapêutica.'
      })),
    [items]
  )

  useEffect(() => {
    if (safeItems.length <= 1) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (!visible.length) return
        const index = Number((visible[0].target as HTMLElement).dataset.galleryIndex)
        if (!Number.isNaN(index)) {
          setActiveIndex(index)
        }
      },
      {
        root: null,
        threshold: [0.3, 0.5, 0.75],
        rootMargin: '-15% 0px -35% 0px'
      }
    )

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [safeItems.length])

  const currentItem = safeItems[activeIndex] ?? safeItems[0]

  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="grid gap-4">
          {safeItems.map((item, index) => {
            const isActive = activeIndex === index
            return (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                data-gallery-index={index}
                onClick={() => setActiveIndex(index)}
                className={`rounded-3xl border p-5 text-left transition sm:p-6 lg:min-h-[38vh] ${
                  isActive
                    ? 'border-gold/50 bg-surface/95 shadow-[0_0_0_1px_rgba(255,199,93,0.22)_inset]'
                    : 'border-border/70 bg-surface/60 hover:border-gold/30 hover:bg-surface/75'
                }`}
                aria-current={isActive}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-gold-soft">
                  Tela {index + 1}
                </span>
                <h3 className="mt-2 font-serif text-xl text-ink">{item.label}</h3>
                <p className="mt-2 text-sm text-ink-muted sm:text-base">{item.description}</p>
              </button>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/40 p-1">
            <div className="relative">
              {safeItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={`transition-all duration-500 ${
                    activeIndex === index
                      ? 'relative z-10 opacity-100 translate-y-0'
                      : 'pointer-events-none absolute inset-0 z-0 opacity-0 translate-y-2'
                  }`}
                  aria-hidden={activeIndex !== index}
                >
                  <MediaPlaceholder variant={item.variant ?? 'horizontal'} label={item.label} />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            {currentItem ? currentItem.description : ''}
          </p>
        </div>
      </div>
    </SectionShell>
  )
}
