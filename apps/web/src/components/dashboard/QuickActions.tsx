'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Calendar, 
  MessageCircle, 
  Search, 
  Users, 
  Video,
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface QuickActionProps {
  title: string
  description: string
  icon: React.ElementType
  href: string
  badge?: string
  variant?: 'default' | 'secondary' | 'outline'
  index: number
  livePulse?: boolean
}

function QuickActionCard({ title, description, icon: Icon, href, badge, variant = 'default', index, livePulse }: QuickActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={href}>
        <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10 relative">
                {livePulse && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                )}
                <Icon className="h-5 w-5 text-primary" />
              </div>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

// Tipagem mínima do evento retornado pela API
interface ApiEvent {
  id: string
  title: string
  type: string
  status: string
  startDate: string
  endDate: string
  virtualLink?: string | null
}

export function QuickActions() {
  // Estado para próxima live
  const [nextLive, setNextLive] = useState<ApiEvent | null>(null)
  const [loadingLive, setLoadingLive] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    const fetchNextLive = async () => {
      try {
        const nowIso = new Date().toISOString()
        // Considera tipos comuns de "aulas ao vivo"
        const params = new URLSearchParams({
          type: ['WEBINAR', 'WORKSHOP'].join(','),
          status: ['PUBLISHED'].join(','),
          startDate: nowIso,
          isPublic: 'true',
          limit: '1',
          page: '1'
        })
        const res = await fetch(`/api/events?${params.toString()}`)
        if (!res.ok) throw new Error('Falha ao buscar eventos')
        const data = await res.json()
        const event: ApiEvent | undefined = data?.events?.[0]
        if (isMounted) setNextLive(event || null)
      } catch (e) {
        if (isMounted) setNextLive(null)
      } finally {
        if (isMounted) setLoadingLive(false)
      }
    }

    fetchNextLive()
    // Atualiza a cada 60s para manter o rótulo relativamente fresco
    const id = setInterval(fetchNextLive, 60000)
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  const liveDescription = useMemo(() => {
    if (loadingLive) return 'Carregando...'
    if (!nextLive) return 'Sem próximas sessões'

    const start = new Date(nextLive.startDate)
    const end = new Date(nextLive.endDate)
    const now = new Date()

    // Ao vivo agora
    if (start <= now && end > now) {
      return 'Ao vivo agora'
    }

    const diffMs = start.getTime() - now.getTime()
    const diffMin = Math.round(diffMs / 60000)

    if (diffMin < 60 && diffMin > 0) {
      return `Começa em ${diffMin} min`
    }

    if (isToday(start)) {
      return `Hoje às ${format(start, 'HH:mm')}`
    }

    if (isTomorrow(start)) {
      return `Amanhã às ${format(start, 'HH:mm')}`
    }

    // Fallback: distância relativa
    const dist = formatDistanceToNowStrict(start, { locale: ptBR })
    return `Próxima em ${dist}`
  }, [loadingLive, nextLive])

  const liveHref = nextLive ? `/eventos/${nextLive.id}` : '/eventos'

  const liveBadge = nextLive ? ((nextLive.type === 'WEBINAR' || nextLive.type === 'WORKSHOP') ? nextLive.type : undefined) : undefined

  const livePulse = useMemo(() => {
    if (!nextLive) return false
    const start = new Date(nextLive.startDate)
    const end = new Date(nextLive.endDate)
    const now = new Date()
    // Pulsar se estiver ao vivo ou começando em até 10 minutos
    if (start <= now && end > now) return true
    const diffMin = Math.round((start.getTime() - now.getTime()) / 60000)
    return diffMin > 0 && diffMin <= 10
  }, [nextLive])

  const actions = [
    {
      title: 'Continuar Curso',
      description: 'Retome onde parou',
      icon: BookOpen,
      href: '/dashboard/courses',
      badge: undefined
    },
    {
      title: 'Agendar Sessão',
      description: 'Marque uma mentoria',
      icon: Calendar,
      href: '/dashboard/calendar'
    },
    {
      title: 'Buscar Conteúdo',
      description: 'Encontre novos cursos',
      icon: Search,
      href: '/cursos'
    },
    {
      title: 'Comunidade',
      description: 'Conecte-se com outros',
      icon: Users,
      href: '/comunidade'
    },
    {
      title: 'Aula ao Vivo',
      description: liveDescription,
      icon: Video,
      href: liveHref,
      badge: liveBadge,
      livePulse
    },
    {
      title: 'Fórum',
      description: 'Tire suas dúvidas',
      icon: MessageCircle,
      href: '/forum'
    },
    {
      title: 'Relatórios',
      description: 'Analise seu progresso',
      icon: FileText,
      href: '/dashboard/reports'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ações Rápidas</h2>
        <Button variant="ghost" size="sm">
          Ver todas
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {actions.map((action, index) => (
          <QuickActionCard
            key={action.title}
            {...action}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
