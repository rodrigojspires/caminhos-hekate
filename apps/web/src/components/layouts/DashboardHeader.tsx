'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Search, Settings, User, LogOut, ShoppingBag, Star } from 'lucide-react'
import Link from 'next/link'
import { NotificationBell } from '@/components/ui/notification-bell'
import { useAdminSession } from '@/hooks/use-admin-session'
import { useSession, signOut } from 'next-auth/react'
import { useGamificationStore } from '@/stores/gamificationStore'
import { useEffect, useMemo } from 'react'

interface DashboardHeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { data: session } = useSession()
  const user = session?.user
  const { hasAdminAccess } = useAdminSession()
  const { userPoints, isLoadingPoints, fetchUserPoints } = useGamificationStore()

  useEffect(() => {
    if (!session?.user?.id) return
    if (!userPoints && !isLoadingPoints) {
      fetchUserPoints()
    }
  }, [session?.user?.id, userPoints, isLoadingPoints, fetchUserPoints])

  const totalPoints = useMemo(() => userPoints?.totalPoints ?? 0, [userPoints])

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-1))]/90 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--temple-surface-1))]/70 px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos, lições..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Store Shortcut */}
        <Button variant="secondary" size="sm" asChild>
          <Link href="/loja" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Loja
          </Link>
        </Button>

        {/* Go to Admin Panel (only for admins/editors) */}
        {hasAdminAccess && (
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin">Painel Admin</Link>
          </Button>
        )}

        <div className="hidden md:flex items-center gap-2 rounded-full border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-3 py-1.5 text-sm shadow-sm">
          <Star className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-[hsl(var(--temple-text-secondary))]">Seus pontos</span>
            <span className="font-semibold">
              {isLoadingPoints ? '…' : totalPoints.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || undefined} alt="Avatar" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Usuário'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || '—'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
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
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                signOut()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
