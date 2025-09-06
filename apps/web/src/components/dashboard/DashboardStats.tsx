'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp,
  Users,
  Target,
  Calendar,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  badge?: string
  index: number
}

function StatCard({ title, value, description, icon: Icon, trend, badge, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend && (
              <div className={`flex items-center text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  trend.isPositive ? '' : 'rotate-180'
                }`} />
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardStats() {
  const stats = [
    {
      title: 'Cursos Ativos',
      value: 3,
      description: 'Em andamento',
      icon: BookOpen,
      trend: { value: 12, isPositive: true },
      badge: 'Ativo'
    },
    {
      title: 'Horas de Estudo',
      value: '24.5h',
      description: 'Este mês',
      icon: Clock,
      trend: { value: 8, isPositive: true }
    },
    {
      title: 'Certificados',
      value: 2,
      description: 'Conquistados',
      icon: Trophy,
      badge: 'Novo'
    },
    {
      title: 'Progresso Médio',
      value: '68%',
      description: 'Todos os cursos',
      icon: Target,
      trend: { value: 15, isPositive: true }
    },
    {
      title: 'Sequência',
      value: '7 dias',
      description: 'Estudo contínuo',
      icon: Calendar,
      trend: { value: 3, isPositive: true },
      badge: 'Streak'
    },
    {
      title: 'Ranking',
      value: '#42',
      description: 'Entre estudantes',
      icon: Award,
      trend: { value: 5, isPositive: true }
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Estatísticas</h2>
        <Badge variant="outline">Atualizado agora</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}