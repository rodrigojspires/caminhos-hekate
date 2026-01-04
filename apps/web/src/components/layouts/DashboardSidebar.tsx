'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  Palette,
  ShoppingBag,
  Settings,
  TrendingUp,
  User,
  X,
  Wrench,
  Award,
  Sparkles,
  Moon,
  Orbit,
  PencilRuler,
  CookingPot,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface DashboardSidebarProps {
  onClose?: () => void
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { labels } = useDashboardVocabulary()
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [upcomingRegisteredCount, setUpcomingRegisteredCount] = useState<number | null>(null)
  const [communityCount, setCommunityCount] = useState<number | null>(null)

  const navigation = [
    {
      name: labels.menu.home,
      href: '/dashboard',
      icon: Sparkles,
    },
    {
      name: labels.menu.courses,
      href: '/dashboard/courses',
      icon: BookOpen,
    },
    {
      name: labels.menu.progress,
      href: '/dashboard/progress',
      icon: TrendingUp,
    },
    {
      name: labels.menu.orders,
      href: '/dashboard/orders',
      icon: CookingPot,
    },
    {
      name: labels.menu.events,
      href: '/dashboard/eventos',
      icon: Moon,
    },
    {
      name: labels.menu.communities,
      href: '/dashboard/comunidades',
      icon: MessageSquare,
    },
    {
      name: labels.menu.planetaryHours,
      href: '/dashboard/tools/planetary-hours',
      icon: Orbit,
    },
    {
      name: labels.menu.sigils,
      href: '/dashboard/tools/magic-square-sigil',
      icon: PencilRuler,
    },
  ]

  const secondaryNavigation = [
    {
      name: labels.menu.profile,
      href: '/dashboard/profile',
      icon: User,
    },
    {
      name: labels.menu.altar,
      href: '/dashboard/settings',
      icon: Palette,
    },
    {
      name: labels.menu.settings,
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  useEffect(() => {
    let isMounted = true
    // Buscar contagem real de cursos do usuário logado
    fetch('/api/user/courses', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        return data?.stats?.totalCourses as number | undefined
      })
      .then((count) => {
        if (isMounted && typeof count === 'number') setCourseCount(count)
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let isMounted = true
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 6)
    const params = new URLSearchParams({
      startDate: now.toISOString(),
      endDate: end.toISOString()
    })
    fetch(`/api/calendar?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        return Array.isArray(data?.events) ? data.events : []
      })
      .then((events) => {
        if (!isMounted || !Array.isArray(events)) return
        const count = events.filter((event) => event.userRegistration && new Date(event.end) > new Date()).length
        setUpcomingRegisteredCount(count)
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let isMounted = true
    fetch('/api/communities', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        const list = Array.isArray(data?.communities) ? data.communities : []
        return list.filter((community) => community.isMember).length
      })
      .then((count) => {
        if (isMounted && typeof count === 'number') setCommunityCount(count)
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  return (
    <div className="flex h-full flex-col temple-page bg-[hsl(var(--temple-surface-1))]">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-[hsl(var(--temple-border-subtle))]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image
              src="/logo.svg"
              alt="Caminhos de Hekate"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-lg tracking-wide">Grimório</span>
        </Link>
        
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
            aria-label="Fechar menu lateral"
            title="Fechar menu lateral"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const isCourses = item.href === '/dashboard/courses'
            const isEvents = item.href === '/dashboard/eventos'
            const isCommunities = item.href === '/dashboard/comunidades'
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "temple-nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "temple-nav-item-active"
                    : "text-[hsl(var(--temple-text-secondary))]"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {(isCourses && !!courseCount) ? (
                  <Badge variant="secondary" className="ml-auto temple-badge">
                    {courseCount}
                  </Badge>
                ) : (isEvents && !!upcomingRegisteredCount) ? (
                  <Badge variant="secondary" className="ml-auto temple-badge">
                    {upcomingRegisteredCount}
                  </Badge>
                ) : (isCommunities && !!communityCount) ? (
                  <Badge variant="secondary" className="ml-auto temple-badge">
                    {communityCount}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="mt-8">
          <h4 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-[hsl(var(--temple-text-secondary))]">
            Sua Jornada
          </h4>
          <nav className="space-y-2">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "temple-nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "temple-nav-item-active"
                      : "text-[hsl(var(--temple-text-secondary))]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--temple-border-subtle))] p-4">
        <div className="flex items-center gap-3 text-sm text-[hsl(var(--temple-text-secondary))]">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Conectado</span>
        </div>
      </div>
    </div>
  )
}
