"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface NavigationItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavigationItem[]
  badge?: string | number | {
    count: number
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
  disabled?: boolean
  description?: string
}

export interface NavigationProps {
  items: NavigationItem[]
  className?: string
  variant?: 'sidebar' | 'tabs' | 'pills'
}

export function Navigation({ items, className, variant = 'sidebar' }: NavigationProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(label)) {
      newExpanded.delete(label)
    } else {
      newExpanded.add(label)
    }
    setExpandedItems(newExpanded)
  }

  const isActive = (href?: string) => {
    if (!href || !pathname) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.label)
    const active = isActive(item.href)
    const Icon = item.icon

    if (variant === 'tabs') {
      return (
        <Link
          key={item.label}
          href={item.href || '#'}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            active
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300",
            item.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
            {item.badge && (
              <Badge 
                variant={typeof item.badge === 'object' ? item.badge.variant || 'default' : 'default'}
                className="text-xs"
              >
                {typeof item.badge === 'object' ? item.badge.count : item.badge}
              </Badge>
            )}
          </div>
        </Link>
      )
    }

    if (variant === 'pills') {
      return (
        <Link
          key={item.label}
          href={item.href || '#'}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
            active
              ? "bg-purple-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
            item.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
            {item.badge && (
              <Badge 
                variant={typeof item.badge === 'object' ? item.badge.variant || 'default' : 'default'}
                className="text-xs"
              >
                {typeof item.badge === 'object' ? item.badge.count : item.badge}
              </Badge>
            )}
          </div>
        </Link>
      )
    }

    // Sidebar variant (default)
    return (
      <div key={item.label}>
        {item.href && !hasChildren ? (
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              "group",
              active
                ? "bg-purple-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              item.disabled && "opacity-50 cursor-not-allowed",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center space-x-3">
              {Icon && <Icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <Badge 
                variant={typeof item.badge === 'object' ? item.badge.variant || 'default' : 'default'}
                className={cn(
                  "text-xs",
                  active && "bg-purple-500 text-white hover:bg-purple-500"
                )}
              >
                {typeof item.badge === 'object' ? item.badge.count : item.badge}
              </Badge>
            )}
          </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleExpanded(item.label)}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              item.disabled && "opacity-50 cursor-not-allowed",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center space-x-3">
              {Icon && <Icon className="w-4 h-4" />}
              <span>{item.label}</span>
              {item.badge && (
                <Badge 
                  variant={typeof item.badge === 'object' ? item.badge.variant || 'default' : 'secondary'}
                  className="text-xs"
                >
                  {typeof item.badge === 'object' ? item.badge.count : item.badge}
                </Badge>
              )}
            </div>
            {hasChildren && (
              <span className="text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
          </button>
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'tabs') {
    return (
      <nav className={cn("flex space-x-8 border-b border-gray-200 dark:border-gray-700", className)}>
        {items.map(renderItem)}
      </nav>
    )
  }

  if (variant === 'pills') {
    return (
      <nav className={cn("flex flex-wrap gap-2", className)}>
        {items.map(renderItem)}
      </nav>
    )
  }

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map(renderItem)}
    </nav>
  )
}

// Quick Actions component
export interface QuickAction {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color?: string
  description?: string
}

export interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
  columns?: number
}

export function QuickActions({ actions, className, columns = 2 }: QuickActionsProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className={cn(
                "p-2 rounded-lg",
                action.color || "bg-purple-100 dark:bg-purple-900"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  action.color ? "text-white" : "text-purple-600 dark:text-purple-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {action.label}
                </h3>
                {action.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}