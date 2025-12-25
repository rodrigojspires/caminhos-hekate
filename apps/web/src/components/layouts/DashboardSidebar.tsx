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
  Award
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface DashboardSidebarProps {
  onClose?: () => void
}

const navigation = [
  {
    name: 'Minha Escola',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Meus Cursos',
    href: '/dashboard/courses',
    icon: BookOpen,
    // badge removido: será dinâmico via estado
  },
  {
    name: 'Progresso',
    href: '/dashboard/progress',
    icon: TrendingUp,
  },
  {
    name: 'Meus Pedidos',
    href: '/dashboard/orders',
    icon: ShoppingBag,
  },
  {
    name: 'Eventos',
    href: '/dashboard/eventos',
    icon: Calendar,
  },
  {
    name: 'Ferramentas: Horas Planetárias',
    href: '/dashboard/tools/planetary-hours',
    icon: Wrench,
  },
  {
    name: 'Ferramentas: Sigilo (Quadrado Mágico)',
    href: '/dashboard/tools/magic-square-sigil',
    icon: Wrench,
  },
]

const secondaryNavigation = [
  {
    name: 'Perfil',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Personalização',
    href: '/dashboard/settings',
    icon: Palette,
  },
  {
    name: 'Configurações',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [upcomingRegisteredCount, setUpcomingRegisteredCount] = useState<number | null>(null)

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image
              src="/logo.svg"
              alt="Caminhos de Hekate"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-lg">Minha Escola</span>
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
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {(isCourses && !!courseCount) ? (
                  <Badge variant="secondary" className="ml-auto">
                    {courseCount}
                  </Badge>
                ) : (isEvents && !!upcomingRegisteredCount) ? (
                  <Badge variant="secondary" className="ml-auto">
                    {upcomingRegisteredCount}
                  </Badge>
                ) : item.badge ? (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="mt-8">
          <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Conta
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
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
      <div className="border-t p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Online</span>
        </div>
      </div>
    </div>
  )
}
