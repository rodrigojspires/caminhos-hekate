'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
  homeHref?: string
  separator?: React.ReactNode
}

export function Breadcrumbs({
  items,
  className,
  showHome = true,
  homeHref = '/dashboard',
  separator = <ChevronRight className="h-4 w-4" />
}: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Dashboard', href: homeHref }, ...items]
    : items

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isCurrent = item.current || isLast

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-muted-foreground">
                  {separator}
                </span>
              )}
              
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {index === 0 && showHome ? (
                    <span className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              ) : (
                <span
                  className={cn(
                    'font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {index === 0 && showHome ? (
                    <span className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Hook para gerar breadcrumbs automaticamente baseado na rota
export function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  return React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Mapeamento de rotas para labels mais amigáveis
    const routeLabels: Record<string, string> = {
      dashboard: 'Dashboard',
      courses: 'Meus Cursos',
      progress: 'Progresso',
      certificates: 'Certificados',
      calendar: 'Agenda',
      community: 'Comunidade',
      messages: 'Mensagens',
      subscription: 'Assinatura',
      settings: 'Configurações',
      profile: 'Perfil',
      notifications: 'Notificações',
      billing: 'Cobrança',
      security: 'Segurança',
      preferences: 'Preferências'
    }

    let currentPath = ''
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1
      
      breadcrumbs.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    })

    return breadcrumbs
  }, [pathname])
}