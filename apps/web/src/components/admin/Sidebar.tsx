"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  BookOpen, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Moon, 
  ChevronLeft,
  ChevronRight,
  Package,
  FileText,
  Calendar,
  Bell,
  DollarSign,
  Trophy,
  Award
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Usuários",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Produtos",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Pedidos",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    title: "Cursos",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "Eventos",
    href: "/admin/events",
    icon: Calendar,
  },
  {
    title: "Posts",
    href: "/admin/community/posts",
    icon: FileText,
  },
  {
    title: "Comunidade",
    href: "/admin/community",
    icon: MessageSquare,
  },
  {
    title: "Grupos",
    href: "/dashboard/grupos",
    icon: Users,
  },
  {
    title: "Gamification",
    href: "/admin/gamification",
    icon: Trophy,
  },
  {
    title: "Templates de Certificado",
    href: "/admin/certificates/templates",
    icon: Award,
  },
  // Eventos e Notificações ainda não possuem páginas no admin
  // Removidos para evitar 404 no painel
  {
    title: "Relatórios",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Faturas",
    href: "/admin/invoices",
    icon: DollarSign,
  },
  {
    title: "Cupons",
    href: "/admin/coupons",
    icon: DollarSign,
  },
  {
    title: "Planos",
    href: "/admin/subscriptions/plans",
    icon: DollarSign,
  },
  {
    title: "Configurações",
    href: "/admin/settings",
    icon: Settings,
  },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "bg-gray-900 text-white transition-all duration-300 flex flex-col h-full",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <Moon className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="font-bold text-lg">Hekate</h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </div>
          )}
          {collapsed && (
            <Moon className="w-8 h-8 text-purple-400 mx-auto" />
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 bg-gray-900 border border-gray-700 rounded-full p-1 hover:bg-gray-800 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group",
                isActive 
                  ? "bg-purple-600 text-white" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-white" : "text-gray-400 group-hover:text-white"
              )} />
              {!collapsed && (
                <span className="font-medium">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="text-xs text-gray-500 text-center">
            © 2024 Caminhos de Hekate
          </div>
        )}
      </div>
    </div>
  )
}
