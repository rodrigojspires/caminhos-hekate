"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"
import { Header } from "@/components/admin/Header"
import { useAdminSession } from "@/hooks/use-admin-session"
import { Toaster } from "sonner"
import CookieConsentBanner from "@/components/privacy/CookieConsentBanner"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { hasAdminAccess, isLoading } = useAdminSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !hasAdminAccess) {
      router.push("/unauthorized")
    }
  }, [hasAdminAccess, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  if (!hasAdminAccess) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? "ml-16" : "ml-64"
      }`}>
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        theme="dark"
      />
      <CookieConsentBanner />
    </div>
  )
}
