"use client"

import { Progress } from "@/components/ui/progress"
import { Clock, BookOpen, CheckCircle, Target } from "lucide-react"

interface CourseProgressProps {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  totalHours: number
  completedHours: number
  averageProgress?: number
  loading?: boolean
}

export function CourseProgress({ 
  totalCourses,
  completedCourses,
  inProgressCourses,
  totalHours,
  completedHours,
  averageProgress = 0,
  loading = false 
}: CourseProgressProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-muted rounded-lg"></div>
              <div className="w-16 h-6 bg-muted rounded"></div>
            </div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const streakDays = 0 // Placeholder - pode ser implementado futuramente
  
  const progressCards = [
    {
      title: "Cursos Concluídos",
      value: completedCourses,
      total: totalCourses,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10 dark:bg-green-500/20",
      progress: totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0
    },
    {
      title: "Em Progresso",
      value: inProgressCourses,
      total: totalCourses,
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      progress: totalCourses > 0 ? (inProgressCourses / totalCourses) * 100 : 0
    },
    {
      title: "Horas de Estudo",
      value: completedHours,
      total: totalHours,
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
      progress: totalHours > 0 ? (completedHours / totalHours) * 100 : 0,
      suffix: "h"
    },
    {
      title: "Sequência de Dias",
      value: streakDays,
      total: 30,
      icon: Target,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      progress: (streakDays / 30) * 100,
      suffix: " dias"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Progresso Geral</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Progresso Médio dos Cursos</span>
            <span className="text-sm font-bold text-foreground">{averageProgress.toFixed(1)}%</span>
          </div>
          <Progress value={averageProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {progressCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {card.value}{card.suffix || ''}
                  </div>
                  {card.total !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      de {card.total}{card.suffix || ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                  <span className="text-xs text-muted-foreground">{card.progress.toFixed(0)}%</span>
                </div>
                <Progress value={card.progress} className="h-2" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekly Progress */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Progresso Semanal</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
            const isActive = index < streakDays % 7
            return (
              <div key={day} className="text-center">
                <div className="text-xs text-muted-foreground mb-2">{day}</div>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isActive ? <CheckCircle className="w-4 h-4" /> : <div className="w-2 h-2 bg-current rounded-full" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}