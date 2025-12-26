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
import { BookOpen, Clock, Target, TrendingUp, AlertCircle, Compass } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#c084fc', '#5eead4', '#a7f3d0', '#fde047', '#fda4af', '#fb923c']

interface ProgressData {
  overview: {}
  weeklyProgress: Array<{ week: string; lessons: number }>
  monthlyData: Array<{ month: string; lessons: number; hours: number }>
  courseProgress: Array<{
    courseId: string
    courseTitle: string
    completedLessons: number
    totalLessons: number
    progress: number
  }>
}

export function ProgressOverview() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgressData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/user/progress')
      if (!response.ok) throw new Error('Erro ao carregar dados de progresso')
      const data = await response.json()
      setProgressData(data)
    } catch (error) {
      console.error('Erro ao buscar progresso:', error)
      setError('Não foi possível carregar os dados de progresso')
      toast.error('Erro ao carregar sua trilha')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgressData()
  }, [])

  if (loading) {
    return (
      <Card className="glass-dark border border-hekate-gold/20">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !progressData) {
    return (
       <Card className="glass-dark border border-red-500/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400/80 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-hekate-pearl">Falha ao Consultar os Oráculos</h3>
            <p className="text-hekate-pearl/70 text-sm max-w-sm mx-auto">Não foi possível carregar sua trilha de ascensão. As energias podem estar instáveis.</p>
            <Button onClick={fetchProgressData} variant="outline" className="mt-6">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
    )
  }

  const courseProgressChartData = progressData.courseProgress.map((course, index) => ({
    name: course.courseTitle,
    value: course.progress,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <h2 className="text-2xl font-bold font-serif tracking-tight text-hekate-goldLight">Sua Trilha de Ascensão</h2>
                <p className="text-hekate-pearl/70">Uma visão detalhada da sua jornada evolutiva.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProgressData} disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar Trilha'}
            </Button>
        </div>

      {/* Current Courses Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="glass-dark border border-hekate-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-hekate-pearl">
              <BookOpen className="h-5 w-5 text-hekate-purple-300" />
              Seus Rituais em Andamento
            </CardTitle>
            <CardDescription className="text-hekate-pearl/70">Visualize sua jornada em cada portal de conhecimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {progressData.courseProgress.length > 0 ? (
              progressData.courseProgress.map((course, index) => (
                <motion.div key={course.courseId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}/>
                      <span className="font-medium text-hekate-pearl/90">{course.courseTitle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-hekate-pearl/60">
                        {course.completedLessons}/{course.totalLessons} ritos
                      </span>
                      <Badge variant="secondary" className="bg-hekate-purple/20 text-hekate-purple-300 border border-hekate-purple/40 font-bold">{course.progress}%</Badge>
                    </div>
                  </div>
                  <Progress value={course.progress} className="h-2" indicatorClassName={`bg-gradient-to-r from-hekate-purple to-hekate-gold`} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-hekate-pearl/60">
                <Compass className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">Nenhum ritual iniciado.</p>
                <p className="text-sm">Escolha um portal para começar sua jornada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Activity Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-dark border border-hekate-gold/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-hekate-pearl">
                <Clock className="h-5 w-5 text-hekate-purple-300" />
                Ritmo da Semana
              </CardTitle>
              <CardDescription className="text-hekate-pearl/70">Sua dedicação e rito nos últimos 7 dias.</CardDescription>
            </CardHeader>
            <CardContent>
              {progressData.weeklyProgress && progressData.weeklyProgress.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={progressData.weeklyProgress} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(0, 0%, 100%, 0.1)" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} className="text-xs" stroke="hsla(0, 0%, 100%, 0.5)"/>
                    <YAxis axisLine={false} tickLine={false} className="text-xs" stroke="hsla(0, 0%, 100%, 0.5)" />
                    <Tooltip contentStyle={{ backgroundColor: '#110E19', border: '1px solid #4d2d6c', borderRadius: '8px' }} formatter={(value) => [`${value} lições`, 'Ritos Completados']} />
                    <Area type="monotone" dataKey="lessons" stroke="#c084fc" fill="#c084fc" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-hekate-pearl/60">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold">O rito da semana ainda não começou.</p>
                    <p className="text-sm">Dedique-se aos estudos para registrar seu ritmo.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Course Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="glass-dark border border-hekate-gold/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-hekate-pearl">
                <Target className="h-5 w-5 text-hekate-purple-300" />
                Foco da Alma
              </CardTitle>
              <CardDescription className="text-hekate-pearl/70">Onde sua energia está sendo canalizada.</CardDescription>
            </CardHeader>
            <CardContent>
              {courseProgressChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={courseProgressChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {courseProgressChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Foco']} contentStyle={{ backgroundColor: '#110E19', border: '1px solid #4d2d6c', borderRadius: '8px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <div className="flex items-center justify-center h-48 text-hekate-pearl/60">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum foco definido.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Progress Trend */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card className="glass-dark border border-hekate-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-hekate-pearl">
              <TrendingUp className="h-5 w-5 text-hekate-purple-300" />
              Ciclos de Evolução
            </CardTitle>
            <CardDescription className="text-hekate-pearl/70">Observe a sua evolução através das luas.</CardDescription>
          </CardHeader>
          <CardContent>
            {progressData.monthlyData && progressData.monthlyData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={progressData.monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(0, 0%, 100%, 0.1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" stroke="hsla(0, 0%, 100%, 0.5)" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" stroke="hsla(0, 0%, 100%, 0.5)" />
                  <Tooltip contentStyle={{ backgroundColor: '#110E19', border: '1px solid #4d2d6c', borderRadius: '8px' }} formatter={(value, name) => {
                      if (name === 'lessons') return [`${value} ritos`, 'Ritos Completados']
                      if (name === 'hours') return [`${value}h`, 'Horas em Rito']
                      return [value, name]
                    }} />
                  <Bar dataKey="lessons" fill="#a78bfa" radius={[4, 4, 0, 0]} name="lessons"/>
                  <Bar dataKey="hours" fill="#5eead4" radius={[4, 4, 0, 0]} name="hours" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60 text-hekate-pearl/60">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Ainda não há ciclos para mostrar.</p>
                  <p className="text-sm">Sua jornada mensal será registrada aqui.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}