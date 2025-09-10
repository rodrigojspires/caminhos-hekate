"use client"
import { useState, useEffect } from 'react'
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Metadata moved to parent layout or removed for client component compliance

interface ProgressData {
  weeklyProgress: {
    week: string
    studyTime: number
    lessonsCompleted: number
    points: number
  }[]
  categoryProgress: {
    category: string
    completed: number
    total: number
    percentage: number
  }[]
  dailyActivity: {
    date: string
    minutes: number
    lessons: number
  }[]
  monthlyGoals: {
    month: string
    target: number
    achieved: number
  }[]
}

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData>({
    weeklyProgress: [],
    categoryProgress: [],
    dailyActivity: [],
    monthlyGoals: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProgressData = async () => {
      setLoading(true)
      try {
        // Buscar dados de gamificação
        const statsResponse = await fetch('/api/gamification/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          
          // Converter dados da API para o formato esperado
          const convertedData: ProgressData = {
            weeklyProgress: statsData.weeklyActivity?.map((day: any, index: number) => ({
              week: `Semana ${Math.floor(index / 7) + 1}`,
              studyTime: day.points * 2, // Converter pontos em minutos estimados
              lessonsCompleted: Math.floor(day.points / 10), // Estimar lições baseado em pontos
              points: day.points
            })) || [],
            categoryProgress: statsData.categoryProgress?.map((cat: any) => ({
              category: cat.name,
              completed: cat.unlocked,
              total: cat.total,
              percentage: cat.progress
            })) || [],
            dailyActivity: statsData.weeklyActivity?.map((day: any) => ({
              date: day.date,
              minutes: day.points * 2, // Converter pontos em minutos
              lessons: Math.floor(day.points / 10) // Estimar lições
            })) || [],
            monthlyGoals: [
              {
                month: 'Janeiro',
                target: 1000,
                achieved: statsData.totalPoints || 0
              }
            ]
          }
          
          setProgressData(convertedData)
        }
      } catch (error) {
        console.error('Error fetching progress data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgressData()
  }, [])
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Progresso</h1>
        <p className="text-muted-foreground">
          Visualize seu desenvolvimento e conquistas ao longo do tempo
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressCharts data={progressData} loading={loading} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProgressTimeline events={[]} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <ProgressGoals 
            goals={[]}
            onCreateGoal={() => {}}
            onUpdateGoal={() => {}}
            onDeleteGoal={() => {}}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ProgressInsights insights={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
