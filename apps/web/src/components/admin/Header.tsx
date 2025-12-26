'use client'

import { useState } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Search, User, LogOut, Settings, Moon, Sun, LayoutDashboard } from "lucide-react"
import { useAdminSession } from "@/hooks/use-admin-session"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/ui/notification-bell"

interface HeaderProps {
  title?: string
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  const { user, isAdmin } = useAdminSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/admin/login" })
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark', !isDarkMode)
  }

  return (
    <header className="bg-transparent border-b border-hekate-gold/20 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-hekate-pearl">
            {title}
          </h1>
          <p className="text-sm text-hekate-pearl/60">
            Bem-vindo ao painel administrativo
          </p>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-hekate-pearl/50" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 bg-card border border-hekate-gold/30 rounded-lg text-sm text-hekate-pearl focus:outline-none focus:ring-2 focus:ring-hekate-purple-500 focus:border-transparent w-64"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-hekate-pearl/70 hover:text-hekate-pearl hover:bg-white/5 rounded-lg transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-hekate-pearl/70 hover:text-hekate-pearl hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-hekate-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-hekate-pearl">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-hekate-pearl/60">
                  {isAdmin ? "Administrador" : "Editor"}
                </p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-hekate-gold/20 z-50">
                <div className="p-2">
                  <Link href="/dashboard" className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-hekate-pearl/80 hover:bg-white/5 rounded-md">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Ir para o Grimório</span>
                  </Link>
                   <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-hekate-pearl/80 hover:bg-white/5 rounded-md">
                     <Settings className="w-4 h-4" />
                     <span>Configurações</span>
                   </button>
                   <button 
                     onClick={handleSignOut}
                     className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"
                   >
                     <LogOut className="w-4 h-4" />
                     <span>Sair</span>
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </header>
  )
}
