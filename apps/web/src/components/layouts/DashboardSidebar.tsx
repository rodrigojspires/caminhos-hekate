'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  Palette,
  Settings,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

interface DashboardSidebarProps {
  onClose?: () => void
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Meus Cursos',
    href: '/dashboard/courses',
    icon: BookOpen,
    badge: '3',
  },
  {
    name: 'Progresso',
    href: '/dashboard/progress',
    icon: TrendingUp,
  },
  {
    name: 'Certificados',
    href: '/dashboard/certificates',
    icon: Award,
    badge: '2',
  },
  {
    name: 'Calendário',
    href: '/dashboard/calendar',
    icon: Calendar,
  },
  {
    name: 'Relatórios',
    href: '/dashboard/reports',
    icon: BarChart3,
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
    href: '/dashboard/customization',
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
          <span className="font-semibold text-lg">Dashboard</span>
        </Link>
        
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
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
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
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