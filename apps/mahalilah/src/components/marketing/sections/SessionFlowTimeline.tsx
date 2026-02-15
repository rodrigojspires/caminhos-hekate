'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'

export type SessionFlowStep = {
  title: string
  imageSrc?: string
  imageAlt?: string
}

export function SessionFlowTimeline({ steps }: { steps: SessionFlowStep[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})

  const safeSteps = useMemo(
    () =>
      steps.map((step, index) => ({
        ...step,
        imageSrc:
          step.imageSrc || `/marketing/como-funciona/fluxo-${String(index + 1).padStart(2, '0')}.webp`,
        imageAlt: step.imageAlt || `Etapa ${index + 1}: ${step.title}`
      })),
    [steps]
  )

  useEffect(() => {
    if (safeSteps.length <= 1 || isPaused) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSteps.length)
    }, 4200)

    return () => window.clearInterval(intervalId)
  }, [safeSteps.length, isPaused])

  const currentStep = safeSteps[activeIndex] ?? safeSteps[0]
  const shouldShowFallback = !currentStep?.imageSrc || failedImages[activeIndex]

  return (
    <div
      className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <ol className="space-y-4 text-sm text-ink-muted">
        {safeSteps.map((step, index) => {
          const isActive = index === activeIndex
          return (
            <li key={step.title} className="flex gap-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveIndex(index)
                  }
                }}
                className="group flex cursor-pointer items-start gap-3 text-left"
                aria-current={isActive}
              >
                <span
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition ${
                    isActive
                      ? 'border-gold text-gold'
                      : 'border-gold/70 text-gold group-hover:border-gold'
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`transition ${isActive ? 'font-medium text-gold' : 'text-ink-muted'}`}>
                  {step.title}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="lg:sticky lg:top-28 lg:self-start">
        {shouldShowFallback ? (
          <MediaPlaceholder variant="vertical" label="Timeline visual da sessão ao vivo" />
        ) : (
          <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-border/70 bg-surface/85 shadow-soft aspect-[3/4]">
            <Image
              key={currentStep.imageSrc}
              src={currentStep.imageSrc}
              alt={currentStep.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 42vw"
              onError={() =>
                setFailedImages((prev) => ({
                  ...prev,
                  [activeIndex]: true
                }))
              }
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{currentStep?.title || ''}</p>
          <div className="flex items-center gap-2">
            {safeSteps.map((step, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={`${step.title}-dot`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    isActive ? 'bg-gold' : 'bg-gold/35 hover:bg-gold/60'
                  }`}
                  aria-label={`Ir para etapa ${index + 1}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
