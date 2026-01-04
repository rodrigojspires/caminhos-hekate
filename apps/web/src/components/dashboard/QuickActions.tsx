'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Compass, 
  Sparkles, 
  Users, 
  Video,
  Scroll
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
  index: number
  livePulse?: boolean
}

function QuickActionCard({ title, description, icon: Icon, href, badge, index, livePulse }: QuickActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -5, boxShadow: '0px 10px 20px rgba(0,0,0,0.2)' }}
      className="h-full"
    >
      <Link href={href} className="h-full flex flex-col">
        <Card className="temple-card temple-card-hover flex-grow cursor-pointer flex flex-col p-4 text-center items-center justify-center">
            <div className="p-3 rounded-full bg-[hsl(var(--temple-surface-3))] mb-3 relative">
              {livePulse && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <Icon className="h-6 w-6 text-[hsl(var(--temple-accent-gold))]" />
            </div>
            <h3 className="font-bold text-sm text-[hsl(var(--temple-text-primary))] mb-1">{title}</h3>
            <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{description}</p>
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
        const params = new URLSearchParams({
          type: ['WEBINAR', 'WORKSHOP'].join(','),
          status: ['PUBLISHED'].join(','),
          startDate: nowIso,
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
    const id = setInterval(fetchNextLive, 60000)
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  const liveDescription = useMemo(() => {
    if (loadingLive) return 'Carregando...'
    if (!nextLive) return 'Nenhum rito agendado'

    const start = new Date(nextLive.startDate)
    const end = new Date(nextLive.endDate)
    const now = new Date()

    if (start <= now && end > now) {
      return 'Ao vivo agora'
    }

    if (isToday(start)) return `Hoje às ${format(start, 'HH:mm')}`
    if (isTomorrow(start)) return `Amanhã às ${format(start, 'HH:mm')}`

    return `Em ${formatDistanceToNowStrict(start, { locale: ptBR })}`
  }, [loadingLive, nextLive])

  const liveHref = nextLive ? `/eventos/${nextLive.id}` : '/eventos'

  const livePulse = useMemo(() => {
    if (!nextLive) return false
    const start = new Date(nextLive.startDate)
    const end = new Date(nextLive.endDate)
    const now = new Date()
    if (start <= now && end > now) return true
    const diffMin = Math.round((start.getTime() - now.getTime()) / 60000)
    return diffMin > 0 && diffMin <= 15 // Notifica 15 min antes
  }, [nextLive])

  const actions = [
    {
      title: 'Continuar Ritual',
      description: 'Retome sua jornada',
      icon: BookOpen,
      href: '/dashboard/courses',
    },
    {
      title: 'Explorar Rituais',
      description: 'Novos cursos e chaves',
      icon: Compass,
      href: '/cursos'
    },
    {
      title: 'Comunidade',
      description: 'Conecte-se à egrégora',
      icon: Users,
      href: '/comunidade'
    },
    {
      title: 'Ritual ao Vivo',
      description: liveDescription,
      icon: Video,
      href: liveHref,
      livePulse
    },
    {
      title: 'Trilha de Ascensão',
      description: 'Veja sua evolução',
      icon: Sparkles,
      href: '/dashboard/progress'
    },
    {
      title: 'Oráculo do Grimório',
      description: 'Pergunte e compartilhe',
      icon: Scroll,
      href: '/forum' // Supondo que /forum seja a rota
    }
  ]

  return (
    <div className="space-y-4 my-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-semibold temple-section-title">Atalhos Arcanos</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/tools" className="text-[hsl(var(--temple-accent-gold))] hover:text-[hsl(var(--temple-accent-gold))]/80">Ver todos</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
