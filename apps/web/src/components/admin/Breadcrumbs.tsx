"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  current?: boolean
}

export interface BreadcrumbsProps {
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
  homeHref = "/admin",
  separator
}: BreadcrumbsProps) {
  const allItems = showHome 
    ? [{ label: "Dashboard", href: homeHref, icon: Home }, ...items]
    : items

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const Icon = item.icon

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400 dark:text-gray-500">
                  {separator || <ChevronRight className="w-4 h-4" />}
                </span>
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-1 text-gray-600 dark:text-gray-400",
                    "hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className={cn(
                  "flex items-center space-x-1",
                  isLast
                    ? "text-gray-900 dark:text-white font-medium"
                    : "text-gray-600 dark:text-gray-400"
                )}>
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Hook to generate breadcrumbs from pathname
export function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  
  // Remove 'admin' from segments if present
  const adminIndex = segments.indexOf('admin')
  if (adminIndex !== -1) {
    segments.splice(adminIndex, 1)
  }

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = '/admin'

  // Map of route segments to labels
  const routeLabels: Record<string, string> = {
    'users': 'Usuários',
    'products': 'Produtos',
    'orders': 'Pedidos',
    'courses': 'Cursos',
    'posts': 'Posts',
    'community': 'Comunidade',
    'events': 'Eventos',
    'notifications': 'Notificações',
    'reports': 'Relatórios',
    'settings': 'Configurações',
    'create': 'Criar',
    'edit': 'Editar',
    'view': 'Visualizar'
  }

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Check if this is an ID (numeric or UUID-like)
    const isId = /^[0-9]+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    
    if (isId) {
      // For IDs, use a generic label or try to get from context
      breadcrumbs.push({
        label: `#${segment.slice(0, 8)}`,
        href: currentPath
      })
    } else {
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      const isLast = index === segments.length - 1
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    }
  })

  return breadcrumbs
}

// Page Header component that includes breadcrumbs
export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}