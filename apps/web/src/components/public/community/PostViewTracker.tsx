"use client"

import { useEffect, useRef } from 'react'

type PostViewTrackerProps = {
  postId: string
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
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
            }, 3000)
          }
        } else if (!entry.isIntersecting && timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      },
      { threshold: 0.6 }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [postId])

  return <div ref={ref} className="h-px w-full" aria-hidden="true" />
}
