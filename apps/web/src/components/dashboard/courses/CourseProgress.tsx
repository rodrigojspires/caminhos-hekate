"use client"

import { Progress } from "@/components/ui/progress"
import { Clock, BookOpen, CheckCircle, Target } from "lucide-react"

interface CourseProgressProps {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  notStartedCourses: number
  totalHours: number
  completedHours: number
  averageProgress?: number
  weeklyProgress?: number[]
  streakDays?: number
  loading?: boolean
}

export function CourseProgress({ 
  totalCourses,
  completedCourses,
  inProgressCourses,
  notStartedCourses,
  totalHours,
  completedHours,
  averageProgress = 0,
  weeklyProgress = [],
  streakDays = 0,
  loading = false 
}: CourseProgressProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="temple-card p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-[hsl(var(--temple-surface-2))] rounded-lg"></div>
              <div className="w-16 h-6 bg-[hsl(var(--temple-surface-2))] rounded"></div>
            </div>
            <div className="h-4 bg-[hsl(var(--temple-surface-2))] rounded mb-2"></div>
            <div className="h-2 bg-[hsl(var(--temple-surface-2))] rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const inProgressTotalBase = Math.max(0, totalCourses - completedCourses)
  const weeklySlots = weeklyProgress.length === 7 ? weeklyProgress : new Array(7).fill(0)
  
  const progressCards = [
    {
      title: "Cursos Concluídos",
      value: completedCourses,
      total: totalCourses,
      icon: CheckCircle,
      color: "text-emerald-300",
      bgColor: "bg-emerald-500/15",
      progress: totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0
    },
    {
      title: "Em Progresso",
      value: inProgressCourses,
      total: inProgressTotalBase || inProgressCourses,
      icon: BookOpen,
      color: "text-[hsl(var(--temple-accent-gold))]",
      bgColor: "bg-[hsl(var(--temple-accent-gold))]/10",
      progress: inProgressTotalBase > 0 ? (inProgressCourses / inProgressTotalBase) * 100 : 0
    },
    {
      title: "Horas de Estudo",
      value: completedHours,
      total: totalHours,
      icon: Clock,
      color: "text-[hsl(var(--temple-accent-violet))]",
      bgColor: "bg-[hsl(var(--temple-accent-violet))]/12",
      progress: totalHours > 0 ? (completedHours / totalHours) * 100 : 0,
      suffix: "h"
    },
    {
      title: "Sequência de Dias",
      value: streakDays,
      total: Math.max(7, streakDays || 1),
      icon: Target,
      color: "text-[hsl(var(--temple-accent-gold))]",
      bgColor: "bg-[hsl(var(--temple-accent-gold))]/12",
      progress: Math.min(100, (streakDays / Math.max(7, streakDays || 1)) * 100),
      suffix: streakDays === 1 ? " dia" : " dias"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Indicadores (2 colunas x 2 linhas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {progressCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="temple-card p-6 overflow-hidden">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-lg ${card.bgColor} shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="ml-auto text-right">
                  <div className="text-lg font-bold text-[hsl(var(--temple-text-primary))] whitespace-nowrap leading-tight">
                    {card.value}{card.suffix || ''}
                  </div>
                  {card.total !== undefined && (
                    <div className="text-xs text-[hsl(var(--temple-text-secondary))] whitespace-nowrap leading-tight">
                      de {card.total}{card.suffix || ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs font-medium text-[hsl(var(--temple-text-secondary))] truncate max-w-[160px]"
                    title={card.title}
                  >
                    {card.title}
                  </span>
                  <span className="text-xs text-[hsl(var(--temple-text-secondary))]">{card.progress.toFixed(0)}%</span>
                </div>
                <Progress value={card.progress} className="h-2" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Progresso Geral */}
      <div className="temple-card p-6">
        <h3 className="text-lg font-semibold text-[hsl(var(--temple-text-primary))] mb-4">Progresso Geral</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Progresso Médio dos Cursos</span>
            <span className="text-sm font-bold text-[hsl(var(--temple-text-primary))]">{averageProgress.toFixed(1)}%</span>
          </div>
          <Progress value={averageProgress} className="h-3" />
          <div className="flex justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Progresso Semanal */}
      <div className="temple-card p-6">
        <h3 className="text-lg font-semibold text-[hsl(var(--temple-text-primary))] mb-4">Progresso Semanal</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
            const activityCount = weeklySlots[index] || 0
            const isActive = activityCount > 0
            return (
              <div key={day} className="text-center">
                <div className="text-xs text-[hsl(var(--temple-text-secondary))] mb-2">{day}</div>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  isActive 
                    ? 'bg-[hsl(var(--temple-accent-gold))] text-[#1b1405]' 
                    : 'bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-secondary))]'
                }`}>
                  {isActive ? (
                    <div className="text-xs font-semibold">{activityCount}</div>
                  ) : (
                    <div className="w-2 h-2 bg-current rounded-full" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
