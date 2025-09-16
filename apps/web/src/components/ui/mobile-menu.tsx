'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Menu,
  X,
  Home,
  BookOpen,
  Users,
  MessageCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Star,
  Award,
  Calendar,
  Bell,
  Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface NavigationItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavigationItem[]
  requiresAuth?: boolean
}

interface MobileMenuProps {
  navigation?: NavigationItem[]
  className?: string
}

// Default navigation items
const defaultNavigation: NavigationItem[] = [
  {
    title: 'Início',
    href: '/',
    icon: Home
  },
  {
    title: 'Cursos',
    href: '/cursos',
    icon: BookOpen,
    children: [
      { title: 'Todos os Cursos', href: '/cursos' },
      { title: 'Tarot', href: '/cursos/tarot' },
      { title: 'Numerologia', href: '/cursos/numerologia' },
      { title: 'Astrologia', href: '/cursos/astrologia' },
      { title: 'Meditação', href: '/cursos/meditacao' }
    ]
  },
  {
    title: 'Comunidade',
    href: '/comunidade',
    icon: Users
  },
  {
    title: 'Sobre',
    href: '/sobre',
    icon: MessageCircle
  }
]

const dashboardNavigation: NavigationItem[] = [
  {
    title: 'Minha Escola',
    href: '/dashboard',
    icon: Home
  },
  {
    title: 'Meus Cursos',
    href: '/dashboard/courses',
    icon: BookOpen,
    badge: '3'
  },
  {
    title: 'Progresso',
    href: '/dashboard/progress',
    icon: Award
  },
  {
    title: 'Agenda',
    href: '/dashboard/calendar',
    icon: Calendar
  },
  {
    title: 'Ferramentas',
    href: '/dashboard/tools',
    icon: Wrench,
    children: [
      { title: 'Horas Planetárias', href: '/dashboard/tools/planetary-hours' },
      { title: 'Sigilo (Quadrado Mágico)', href: '/dashboard/tools/magic-square-sigil' }
    ]
  },
  {
    title: 'Comunidade',
    href: '/dashboard/community',
    icon: Users,
    badge: '12'
  },
  {
    title: 'Notificações',
    href: '/dashboard/notifications',
    icon: Bell,
    badge: '5'
  }
]

function NavigationItems({ 
  items, 
  onItemClick, 
  level = 0 
}: { 
  items: NavigationItem[]
  onItemClick: () => void
  level?: number
}) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href
        const isExpanded = expandedItems.includes(item.title)
        const hasChildren = item.children && item.children.length > 0
        const Icon = item.icon

        return (
          <div key={item.title}>
            {hasChildren ? (
              <Button
                variant="ghost"
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  'w-full justify-between h-auto p-3',
                  level > 0 && 'ml-4 w-[calc(100%-1rem)]',
                  isActive && 'bg-accent text-accent-foreground'
                )}
              >
                <div className="flex items-center space-x-3">
                  {Icon && <Icon className="h-5 w-5" />}
                  <span className="font-medium">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <Link href={item.href} onClick={onItemClick}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-auto p-3',
                    level > 0 && 'ml-4 w-[calc(100%-1rem)]',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <div className="flex items-center space-x-3 w-full">
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="font-medium">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </Button>
              </Link>
            )}
            
            {hasChildren && isExpanded && (
              <div className="mt-1">
                <NavigationItems 
                  items={item.children!} 
                  onItemClick={onItemClick}
                  level={level + 1}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MobileMenu({ 
  navigation,
  className 
}: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  
  // Determine which navigation to use based on current path
  const isDashboard = pathname?.startsWith('/dashboard') || false
  const navItems = navigation || (isDashboard ? dashboardNavigation : defaultNavigation)
  
  const handleItemClick = () => {
    setOpen(false)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('md:hidden', className)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">
              <Link href="/" onClick={handleItemClick}>
                <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Caminhos de Hekate
                </span>
              </Link>
            </SheetTitle>
          </div>
          
          {session?.user && (
            <div className="flex items-center space-x-3 pt-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={session.user.image || ''} alt={session.user.name || 'Usuário'} />
                <AvatarFallback>
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {session.user.name || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
        </SheetHeader>
        
        <Separator />
        
        <div className="flex-1 overflow-y-auto p-6">
          <NavigationItems 
            items={navItems} 
            onItemClick={handleItemClick}
          />
          
          {session?.user && isDashboard && (
            <>
              <Separator className="my-6" />
              <div className="space-y-1">
                <Link href="/dashboard/profile" onClick={handleItemClick}>
                  <Button variant="ghost" className="w-full justify-start h-auto p-3">
                    <User className="h-5 w-5 mr-3" />
                    <span className="font-medium">Perfil</span>
                  </Button>
                </Link>
                
                <Link href="/dashboard/settings" onClick={handleItemClick}>
                  <Button variant="ghost" className="w-full justify-start h-auto p-3">
                    <Settings className="h-5 w-5 mr-3" />
                    <span className="font-medium">Configurações</span>
                  </Button>
                </Link>
                
                <Link href="/minhas-faturas" onClick={handleItemClick}>
                  <Button variant="ghost" className="w-full justify-start h-auto p-3">
                    <span className="inline-block w-5 mr-3" />
                    <span className="font-medium">Minhas Faturas</span>
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  onClick={handleSignOut}
                  className="w-full justify-start h-auto p-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span className="font-medium">Sair</span>
                </Button>
              </div>
            </>
          )}
          
          {!session?.user && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <Link href="/auth/login" onClick={handleItemClick}>
                  <Button className="w-full">
                    Entrar
                  </Button>
                </Link>
                
                <Link href="/auth/register" onClick={handleItemClick}>
                  <Button variant="outline" className="w-full">
                    Criar Conta
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
