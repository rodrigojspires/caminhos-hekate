'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Target, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316']

interface ProgressData {
  overview: {
    totalCourses: number
    completedCourses: number
    inProgressCourses: number
    totalLessonsCompleted: number
    totalLessons: number
    completionRate: number
  }
  weeklyProgress: Array<{
    week: string
    lessons: number
  }>
  monthlyData: Array<{
    month: string
    lessons: number
    hours: number
  }>
  courseProgress: Array<{
    courseId: string
    courseTitle: string
    completedLessons: number
    totalLessons: number
    progress: number
    lastAccessed: Date
  }>
}

export function ProgressOverview() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/progress')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados de progresso')
      }
      
      const data = await response.json()
      setProgressData(data)
    } catch (error) {
      console.error('Erro ao buscar progresso:', error)
      setError('Não foi possível carregar os dados de progresso')
      toast.error('Erro ao carregar dados de progresso')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (error || !progressData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Progresso</h2>
          <Button variant="outline" size="sm" onClick={fetchProgressData}>
            Tentar Novamente
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchProgressData}>
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Preparar dados para os gráficos
  const courseProgressChartData = progressData.courseProgress.map((course, index) => ({
    name: course.courseTitle,
    value: course.progress,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Progresso</h2>
        <Button variant="outline" size="sm" onClick={fetchProgressData}>
          Atualizar Dados
        </Button>
      </div>

      {/* Current Courses Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Progresso dos Cursos Atuais
            </CardTitle>
            <CardDescription>
              Acompanhe seu desenvolvimento em cada curso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progressData.courseProgress.length > 0 ? (
              progressData.courseProgress.map((course, index) => (
                <motion.div
                  key={course.courseId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{course.courseTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{course.progress}%</Badge>
                      <span className="text-sm text-muted-foreground">
                        {course.completedLessons}/{course.totalLessons}
                      </span>
                    </div>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum curso em progresso</p>
                <p className="text-sm">Comece um curso para ver seu progresso aqui</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividade Semanal
              </CardTitle>
              <CardDescription>
                Horas de estudo nos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={progressData.weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value} lições`, 'Lições Completadas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="lessons"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Course Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Distribuição de Tempo
              </CardTitle>
              <CardDescription>
                Como você está dividindo seu tempo de estudo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courseProgressChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={courseProgressChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {courseProgressChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Progresso']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4 flex-wrap">
                    {courseProgressChartData.map((course, index) => (
                      <div key={course.name} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: course.color }}
                        />
                        <span className="text-muted-foreground">{course.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de distribuição disponível</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Progress Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência Mensal
            </CardTitle>
            <CardDescription>
              Seu progresso geral ao longo dos meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={progressData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'lessons') return [`${value} lições`, 'Lições Completadas']
                    if (name === 'hours') return [`${value}h`, 'Horas de Estudo']
                    return [value, name]
                  }}
                />
                <Bar 
                  dataKey="lessons" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                  name="lessons"
                />
                <Bar 
                  dataKey="hours" 
                  fill="#06b6d4" 
                  radius={[4, 4, 0, 0]}
                  name="hours"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}