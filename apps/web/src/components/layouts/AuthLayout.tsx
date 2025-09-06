'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Moon, ArrowLeft, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backButtonText?: string
  backButtonHref?: string
  redirectIfAuthenticated?: boolean
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
  backButtonText = 'Voltar ao início',
  backButtonHref = '/',
  redirectIfAuthenticated = true
}: AuthLayoutProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()

  // Redirect authenticated users
  React.useEffect(() => {
    if (redirectIfAuthenticated && status === 'authenticated' && session) {
      const userRole = session.user?.role
      if (userRole === 'ADMIN' || userRole === 'EDITOR') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, status, redirectIfAuthenticated, router])

  // Show loading while checking authentication
  if (redirectIfAuthenticated && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render if user is authenticated and should be redirected
  if (redirectIfAuthenticated && session) {
    return null
  }
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 xl:px-12 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-pink-300/20 rounded-full blur-lg"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-purple-300/30 rounded-full blur-md"></div>
        </div>
        <div className="relative mx-auto w-full max-w-sm text-center">
          {/* Logo */}
          <Link href="/" className="inline-block group mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 group-hover:scale-105 transition-transform">
              Caminhos de Hekate
            </h1>
          </Link>

          {/* Branding Content */}
          <p className="text-purple-100 text-lg mb-12 leading-relaxed">
            Desperte sua magia interior e transforme sua vida através do conhecimento ancestral.
          </p>
          <div className="space-y-6 text-purple-100">
            <div className="flex items-center justify-center space-x-3 group">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full group-hover:scale-110 transition-transform"></div>
              <span className="text-base">Cursos especializados em magia</span>
            </div>
            <div className="flex items-center justify-center space-x-3 group">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full group-hover:scale-110 transition-transform"></div>
              <span className="text-base">Comunidade de praticantes</span>
            </div>
            <div className="flex items-center justify-center space-x-3 group">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full group-hover:scale-110 transition-transform"></div>
              <span className="text-base">Mentoria personalizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-gray-50/50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {/* Back Button */}
              {showBackButton && (
                <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100">
                  <Link href={backButtonHref} className="flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{backButtonText}</span>
                  </Link>
                </Button>
              )}
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Mobile Logo */}
            <div className="lg:hidden mb-6 text-center">
              <Link href="/" className="inline-block group">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                  Caminhos de Hekate
                </h1>
              </Link>
            </div>
            
            {/* Header */}
            {(title || subtitle) && (
              <div className="text-center lg:text-left">
                {title && (
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-base text-gray-600 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
            {children}
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Ao continuar, você concorda com nossos{' '}
              <Link href="/termos" className="text-primary hover:text-primary/80 underline">
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link href="/privacidade" className="text-primary hover:text-primary/80 underline">
                Política de Privacidade
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/contato" className="hover:text-foreground transition-colors">
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}