'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Menu, X, User, LogOut, Settings, BookOpen, Search, CookingPot } from 'lucide-react'
import { TripleMoonIcon } from '@/components/icons/Esoteric'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import CommandPalette from '@/components/search/CommandPalette'
import { CART_UPDATED_EVENT } from '@/lib/shop/client/cartEvents'

const navigation = [
  { name: 'Início', href: '/' },
  { name: 'Sobre', href: '/sobre' },
  { name: 'Loja', href: '/loja' },
  { name: 'Cursos', href: '/cursos' },
  { name: 'Comunidade', href: '/comunidade' },
  { name: 'Preços', href: '/precos' },
  { name: 'Contato', href: '/contato' },
]

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const { data: session, status } = useSession()

  async function refreshCartCount() {
    try {
      const res = await fetch('/api/shop/cart', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch cart')
      const data = await res.json()
      const items = (data?.cart?.itemsDetailed || data?.cart?.items) || []
      const count = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0)
      setCartCount(isFinite(count) ? count : 0)
    } catch {
      setCartCount(0)
    }
  }

  useEffect(() => {
    refreshCartCount()
    const onVisible = () => document.visibilityState === 'visible' && refreshCartCount()
    const interval = setInterval(refreshCartCount, 30000)
    document.addEventListener('visibilitychange', onVisible)
    const onCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail
      if (detail?.count !== undefined) {
        setCartCount(detail.count)
      } else {
        refreshCartCount()
      }
    }
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated as EventListener)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated as EventListener)
    }
  }, [])

  return (
    <>
    <header className="sticky top-4 z-50 w-full">
      <div className="container glass rounded-lg shadow-lg flex h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <TripleMoonIcon className="h-10 w-10 text-hekate-gold" />
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold gradient-text-gold">
              Caminhos de Hekate
            </span>
            <span className="text-xs text-hekate-goldLight/80 uppercase tracking-widest">
              Escola Iniciática
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-hekate-pearl/80 transition-colors hover:text-hekate-gold"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            aria-label="Abrir busca (Ctrl+K)"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Link href="/caldeirao" className="relative">
            <Button variant="ghost" size="icon">
              <CookingPot className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-hekate-gold text-hekate-black text-xs font-bold">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          {status === 'loading' ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-hekate-gray-800" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-hekate-gold/50">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback className="bg-hekate-purple-900">
                      {session.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass" align="end" forceMount>
                <div className="p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="font-bold text-hekate-pearl">{session.user.name}</p>
                    <p className="text-sm text-hekate-pearl/60 truncate">{session.user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard"><BookOpen className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4" />Configurações</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild><Link href="/auth/login">Entrar</Link></Button>
              <Button variant="outline" className="border-hekate-gold text-hekate-gold hover:bg-hekate-gold hover:text-hekate-black" asChild><Link href="/auth/register">Cadastrar</Link></Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="glass p-0 w-full sm:max-w-sm">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-hekate-gold/20">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                <TripleMoonIcon className="h-8 w-8 text-hekate-gold" />
                <div className="flex flex-col">
                  <span className="font-serif text-xl font-bold gradient-text-gold">Caminhos de Hekate</span>
                  <span className="text-xs text-hekate-goldLight/80 uppercase tracking-widest">Escola Iniciática</span>
                </div>
              </Link>
            </div>
            <nav className="flex-1 p-6 space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-lg font-medium text-hekate-pearl/80 transition-colors hover:text-hekate-gold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-6 border-t border-hekate-gold/20">
              {session ? (
                <div className="space-y-4">
                   <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                  >
                    Sair
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" asChild><Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>Entrar</Link></Button>
                  <Button className="bg-hekate-gold text-hekate-black hover:bg-hekate-gold/90" asChild><Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>Cadastrar</Link></Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
