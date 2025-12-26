'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Users, 
  BookMarked, 
  MessageSquare, 
  Settings, 
  Moon, 
  ChevronLeft,
  ChevronRight,
  Gem,
  ArrowRightLeft,
  CalendarDays,
  ScrollText,
  Circle,
  Trophy,
  KeyRound,
  Binary,
  Coins,
  Ticket,
  Handshake,
  SlidersHorizontal,
  View
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// A linguagem aqui é profissional, como solicitado.
const menuItems = [
  { title: "Dashboard", href: "/admin", icon: View },
  { title: "Usuários", href: "/admin/users", icon: Users },
  { title: "Produtos", href: "/admin/products", icon: Gem },
  { title: "Pedidos", href: "/admin/orders", icon: ArrowRightLeft },
  { title: "Cursos", href: "/admin/courses", icon: BookMarked },
  { title: "Eventos", href: "/admin/events", icon: CalendarDays },
  { title: "Posts da Comunidade", href: "/admin/community/posts", icon: ScrollText },
  { title: "Comunidade", href: "/admin/community", icon: MessageSquare },
  { title: "Grupos", href: "/dashboard/grupos", icon: Circle },
  { title: "Gamificação", href: "/admin/gamification", icon: Trophy },
  { title: "Templates de Certificado", href: "/admin/certificates/templates", icon: KeyRound },
  { title: "Relatórios", href: "/admin/reports", icon: Binary },
  { title: "Faturas", href: "/admin/invoices", icon: Coins },
  { title: "Cupons", href: "/admin/coupons", icon: Ticket },
  { title: "Planos de Assinatura", href: "/admin/subscriptions/plans", icon: Handshake },
  { title: "Configurações", href: "/admin/settings", icon: SlidersHorizontal },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "bg-card backdrop-blur-md border-r border-hekate-gold/20 text-hekate-pearl transition-all duration-300 flex flex-col h-full",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 h-20 flex items-center justify-center border-b border-hekate-gold/20">
          <div className={cn("flex items-center space-x-3 transition-opacity", collapsed && "opacity-0")}>
            <Moon className="w-8 h-8 text-hekate-purple-300 flex-shrink-0" />
            <div>
              <h1 className="font-bold font-serif text-lg text-hekate-gold-light">Painel do Arconte</h1>
              <p className="text-xs text-hekate-pearl/60">Visão Administrativa</p>
            </div>
          </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-24 bg-card border border-hekate-gold/30 rounded-full p-1.5 hover:bg-hekate-purple-900/50 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center space-x-4 px-4 py-2.5 rounded-lg transition-colors group",
                isActive 
                  ? "bg-hekate-purple-900/50 text-white shadow-inner shadow-purple-900/50" 
                  : "text-hekate-pearl/70 hover:bg-white/5 hover:text-white",
                collapsed && "justify-center space-x-0"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-white" : "text-hekate-pearl/50 group-hover:text-white"
              )} />
              {!collapsed && (
                <span className="font-medium text-sm">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-hekate-gold/20">
        {!collapsed && (
          <div className="text-xs text-hekate-pearl/40 text-center">
            © 2024 Caminhos de Hekate
          </div>
        )}
      </div>
    </div>
  )
}
