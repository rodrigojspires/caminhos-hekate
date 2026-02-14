'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [isPaused, setIsPaused] = useState(false)
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
    if (safeItems.length <= 1 || isPaused) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeItems.length)
    }, 4200)

    return () => window.clearInterval(intervalId)
  }, [safeItems.length, isPaused])

  const currentItem = safeItems[activeIndex] ?? safeItems[0]

  return (
    <SectionShell>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div
        className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="grid gap-4">
          {safeItems.map((item, index) => {
            const isActive = activeIndex === index
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition sm:p-6 ${
                  isActive
                    ? 'border-gold/60 bg-[linear-gradient(145deg,rgba(255,200,92,0.16),rgba(30,44,66,0.9))] shadow-[0_16px_40px_rgba(8,10,14,0.35)]'
                    : 'border-gold/25 bg-[linear-gradient(145deg,rgba(255,200,92,0.07),rgba(20,30,45,0.78))] hover:border-gold/45 hover:bg-[linear-gradient(145deg,rgba(255,200,92,0.11),rgba(24,36,54,0.86))]'
                }`}
                aria-current={isActive}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 ${
                    isActive ? 'opacity-100' : ''
                  }`}
                  style={{
                    background:
                      'radial-gradient(circle at 12% 18%, rgba(255,205,108,0.22), transparent 42%)'
                  }}
                />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-soft">
                    <span aria-hidden className="h-px w-5 bg-gold/60" />
                    Tela {index + 1}
                  </span>
                  <h3 className="mt-2 font-serif text-xl leading-tight text-ink">{item.label}</h3>
                  <p className="mt-2 text-sm text-ink-muted sm:text-base">{item.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-gold/25 bg-surface/40 p-1 shadow-soft">
            <div className="rounded-[1.35rem] border border-border/60 bg-surface/55 p-1">
              <MediaPlaceholder
                key={`${currentItem?.label || 'gallery'}-${activeIndex}`}
                variant={currentItem?.variant ?? 'horizontal'}
                label={currentItem?.label || 'Prévia da tela'}
              />
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
