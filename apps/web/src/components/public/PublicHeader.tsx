'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Menu, X, User, LogOut, Settings, BookOpen, ShoppingCart, ShoppingBag } from 'lucide-react'
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

  // Fetch cart count (sum of quantities)
  async function refreshCartCount() {
    try {
      const res = await fetch('/api/shop/cart', { cache: 'no-store' })
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="relative">
            <TripleMoonIcon className="h-8 w-8 text-hekate-gold" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold text-foreground">
              Caminhos de Hekate
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Escola Iniciática
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="text-sm px-3 py-1.5 border rounded hover:bg-muted"
            aria-label="Abrir busca (Ctrl+K)"
          >
            Buscar
            <span className="ml-2 text-xs text-muted-foreground">Ctrl+K</span>
          </button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/loja" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Loja
            </Link>
          </Button>
          {/* Cart Icon */}
          <Link href="/carrinho" className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback>
                      {session.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user?.name && (
                      <p className="font-medium">{session.user.name}</p>
                    )}
                    {session.user?.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/minhas-faturas">
                    <span className="mr-2 inline-block w-4" />
                    Minhas Faturas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {/* Cart shortcut on mobile */}
            <Link href="/carrinho" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
              <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-md border">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="font-medium">Carrinho</span>
            </Link>

            <div className="pt-4 border-t space-y-2">
              {session ? (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                      Entrar
                    </Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                      Começar Agora
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
    <CommandPalette />
    </>
  )
}
