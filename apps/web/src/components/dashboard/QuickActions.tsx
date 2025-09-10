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
  FileText,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface QuickActionProps {
  title: string
  description: string
  icon: React.ElementType
  href: string
  badge?: string
  variant?: 'default' | 'secondary' | 'outline'
  index: number
}

function QuickActionCard({ title, description, icon: Icon, href, badge, variant = 'default', index }: QuickActionProps) {
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
              <div className="p-2 rounded-lg bg-primary/10">
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

export function QuickActions() {
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
      description: 'Próxima em 2h',
      icon: Video,
      href: '/dashboard/live'
    },
    {
      title: 'Fórum',
      description: 'Tire suas dúvidas',
      icon: MessageCircle,
      href: '/forum'
    },
    {
      title: 'Certificados',
      description: 'Veja suas conquistas',
      icon: Award,
      href: '/dashboard/certificates'
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
