"use client"

import { useEffect, useRef } from 'react'

type PostViewTrackerProps = {
  postId: string
  className?: string
  threshold?: number
  delayMs?: number
}

export default function PostViewTracker({
  postId,
  className,
  threshold = 0.6,
  delayMs = 3000
}: PostViewTrackerProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentRef = useRef(false)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting && !sentRef.current) {
          if (!timerRef.current) {
            timerRef.current = setTimeout(async () => {
              try {
                await fetch(`/api/community/posts/${postId}/view`, { method: 'POST' })
                sentRef.current = true
              } catch {}
            }, delayMs)
          }
        } else if (!entry.isIntersecting && timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      },
      { threshold }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [postId])

  return (
    <div
      ref={ref}
      className={className || 'h-px w-full'}
      aria-hidden="true"
    />
  )
}
