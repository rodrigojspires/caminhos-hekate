'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackMarketingEvent } from '@/lib/marketing/analytics'

const SCROLL_MILESTONES = [25, 50, 75, 100]

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 160)
}

function getScrollDepth() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0

  const total = document.documentElement.scrollHeight - window.innerHeight
  if (total <= 0) return 100
  const current = Math.max(0, window.scrollY)
  return Math.min(100, Math.round((current / total) * 100))
}

export function MarketingAnalyticsProvider() {
  const pathname = usePathname()
  const maxDepthRef = useRef(0)
  const startTimeRef = useRef(Date.now())
  const sentMilestonesRef = useRef<Set<number>>(new Set())
  const rafPendingRef = useRef(false)
  const exitTrackedRef = useRef(false)

  useEffect(() => {
    startTimeRef.current = Date.now()
    maxDepthRef.current = 0
    sentMilestonesRef.current = new Set()
    exitTrackedRef.current = false

    trackMarketingEvent({
      name: 'ml_page_view',
      action: 'view',
      page: pathname,
      properties: {
        title: typeof document !== 'undefined' ? document.title : undefined
      }
    })
  }, [pathname])

  useEffect(() => {
    const evaluateDepth = () => {
      const depth = getScrollDepth()
      if (depth > maxDepthRef.current) {
        maxDepthRef.current = depth
      }

      for (const milestone of SCROLL_MILESTONES) {
        if (maxDepthRef.current >= milestone && !sentMilestonesRef.current.has(milestone)) {
          sentMilestonesRef.current.add(milestone)
          trackMarketingEvent({
            name: 'ml_scroll_depth',
            action: 'milestone',
            label: `${milestone}%`,
            value: milestone,
            page: pathname,
            properties: {
              milestone
            }
          })
        }
      }
    }

    const handleScroll = () => {
      if (rafPendingRef.current) return
      rafPendingRef.current = true
      window.requestAnimationFrame(() => {
        rafPendingRef.current = false
        evaluateDepth()
      })
    }

    evaluateDepth()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const clickable = target.closest('a,button') as HTMLAnchorElement | HTMLButtonElement | null
      if (!clickable) return

      const isCta =
        clickable.dataset.analyticsRole === 'cta' ||
        clickable.classList.contains('btn-primary') ||
        clickable.classList.contains('btn-secondary') ||
        clickable.classList.contains('btn-ghost')

      if (!isCta) return

      const label =
        normalizeText(clickable.dataset.analyticsLabel) ||
        normalizeText(clickable.textContent) ||
        normalizeText(clickable.getAttribute('aria-label')) ||
        'cta_sem_label'

      trackMarketingEvent({
        name: 'ml_cta_click',
        action: 'click',
        label,
        page: pathname,
        properties: {
          elementType: clickable.tagName.toLowerCase(),
          href: clickable instanceof HTMLAnchorElement ? clickable.getAttribute('href') || '' : '',
          target: clickable instanceof HTMLAnchorElement ? clickable.getAttribute('target') || '_self' : '_self'
        }
      })
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname])

  useEffect(() => {
    const trackExit = () => {
      if (exitTrackedRef.current) return
      exitTrackedRef.current = true

      const timeOnPageMs = Date.now() - startTimeRef.current
      trackMarketingEvent({
        name: 'ml_page_exit',
        action: 'exit',
        page: pathname,
        value: maxDepthRef.current,
        useBeacon: true,
        properties: {
          maxScrollDepth: maxDepthRef.current,
          timeOnPageMs
        }
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackExit()
      }
    }

    window.addEventListener('beforeunload', trackExit)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      trackExit()
      window.removeEventListener('beforeunload', trackExit)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pathname])

  return null
}
