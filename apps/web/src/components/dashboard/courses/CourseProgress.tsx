"use client"

import { Progress } from "@/components/ui/progress"
import { Clock, BookOpen, CheckCircle, Target } from "lucide-react"

interface CourseProgressData {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  totalHours: number
  completedHours: number
  averageProgress: number
  streakDays: number
}

interface CourseProgressProps {
  data: CourseProgressData
  loading?: boolean
}

export default function CourseProgress({ data, loading = false }: CourseProgressProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const progressCards = [
    {
      title: "Cursos Concluídos",
      value: data.completedCourses,
      total: data.totalCourses,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      progress: data.totalCourses > 0 ? (data.completedCourses / data.totalCourses) * 100 : 0
    },
    {
      title: "Em Progresso",
      value: data.inProgressCourses,
      total: data.totalCourses,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      progress: data.totalCourses > 0 ? (data.inProgressCourses / data.totalCourses) * 100 : 0
    },
    {
      title: "Horas de Estudo",
      value: data.completedHours,
      total: data.totalHours,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      progress: data.totalHours > 0 ? (data.completedHours / data.totalHours) * 100 : 0,
      suffix: "h"
    },
    {
      title: "Sequência de Dias",
      value: data.streakDays,
      total: 30,
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      progress: (data.streakDays / 30) * 100,
      suffix: " dias"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso Geral</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso Médio dos Cursos</span>
            <span className="text-sm font-bold text-gray-900">{data.averageProgress.toFixed(1)}%</span>
          </div>
          <Progress value={data.averageProgress} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
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
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}{card.suffix || ''}
                  </div>
                  {card.total && (
                    <div className="text-sm text-gray-500">
                      de {card.total}{card.suffix || ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{card.title}</span>
                  <span className="text-xs text-gray-500">{card.progress.toFixed(0)}%</span>
                </div>
                <Progress value={card.progress} className="h-2" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso Semanal</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
            const isActive = index < data.streakDays % 7
            return (
              <div key={day} className="text-center">
                <div className="text-xs text-gray-500 mb-2">{day}</div>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  isActive 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-400'
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