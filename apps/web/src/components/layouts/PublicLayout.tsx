'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { cn } from '@/lib/utils'
import CookieConsentBanner from '@/components/privacy/CookieConsentBanner'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname()
  
  // Hide header and footer on admin, dashboard, and auth pages
  const hideHeaderFooter = pathname?.startsWith('/admin') || 
                          pathname?.startsWith('/dashboard') || 
                          pathname?.startsWith('/auth')

  if (hideHeaderFooter) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container py-8">
        {children}
      </main>
      <PublicFooter />
      <CookieConsentBanner />
    </div>
  )
}
