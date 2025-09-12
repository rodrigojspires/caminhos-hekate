"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Bell, Search, User, LogOut, Settings, Moon, Sun, LayoutDashboard } from "lucide-react"
import { useAdminSession } from "@/hooks/use-admin-session"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  const { user, isAdmin } = useAdminSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/admin/login" })
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    // Here you would implement theme switching logic
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bem-vindo ao painel administrativo
          </p>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Novo pedido recebido</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Há 5 minutos</p>
                  </div>
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Usuário se inscreveu no curso</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Há 1 hora</p>
                  </div>
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Novo comentário na comunidade</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Há 2 horas</p>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isAdmin ? "Administrador" : "Editor"}
                </p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-2">
                  <Link href="/dashboard" className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Ir para Dashboard</span>
                  </Link>
                   <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                     <Settings className="w-4 h-4" />
                     <span>Configurações</span>
                   </button>
                   <button 
                     onClick={handleSignOut}
                     className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
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