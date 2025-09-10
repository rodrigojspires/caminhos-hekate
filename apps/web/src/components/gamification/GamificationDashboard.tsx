'use client'

import React, { useState, useEffect } from 'react'
import { Trophy, Star, Medal, Zap, TrendingUp, Target, Calendar, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
// Removido: import { Button } from '@/components/ui/button'
// Removido: import { AchievementNotification } from './AchievementNotification'
import { NotificationSystem } from './NotificationSystem'
import { ExpandedAchievementDashboard } from './ExpandedAchievementDashboard'
import { RewardCenter } from './RewardCenter'
import { Leaderboard } from './Leaderboard'
import { PointsDisplay } from './dashboard/PointsDisplay'
import { BadgeCollection } from './achievements/BadgeCollection'
import { LevelProgress } from './dashboard/LevelProgress'
// Removido: import { useGamification } from '@/hooks/useGamification'
import { useGamificationStore } from '@/stores/gamificationStore'
import { useInitializeGamification } from '@/stores/gamificationStore'

interface GamificationStats {
  totalAchievements: number
  unlockedAchievements: number
  totalBadges: number
  earnedBadges: number
  currentLevel: number
  totalPoints: number
  availablePoints: number
  experiencePoints: number
  nextLevelPoints: number
  activeStreaks: number
  longestStreak: number
  leaderboardRank: number
  achievementProgress: number
  badgeProgress: number
  levelProgress: number
  recentPointsEarned: number
  recentAchievements: any[]
  recentBadges: any[]
  categoryProgress: any[]
  weeklyActivity: any[]
  streaks: any[]
}

interface GamificationDashboardProps {
  userId?: string
}

export function GamificationDashboard({ userId }: GamificationDashboardProps) {
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const { 
    userPoints, 
    achievements, 
    userAchievements 
  } = useGamificationStore()
  const { initialize } = useInitializeGamification()

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/gamification/stats')
      
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    initialize()
  }, [initialize])

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    progress, 
    color = 'blue' 
  }: {
    title: string
    value: string | number
    icon: any
    description?: string
    progress?: number
    color?: string
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
      red: 'text-red-600 bg-red-100'
    }

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          {progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {progress.toFixed(1)}% completo
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const RecentActivity = () => {
    if (!stats) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentAchievements.slice(0, 3).map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">
                    +{achievement.points} pontos
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {achievement.rarity}
                </Badge>
              </div>
            ))}
            
            {stats.recentBadges.slice(0, 2).map((badge) => (
              <div key={badge.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                  <Medal className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Medalha conquistada
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: badge.color + '20', color: badge.color }}
                >
                  {badge.rarity}
                </Badge>
              </div>
            ))}
            
            {stats.recentAchievements.length === 0 && stats.recentBadges.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const WeeklyProgress = () => {
    if (!stats?.weeklyActivity) return null

    const maxPoints = Math.max(...stats.weeklyActivity.map(d => d.points), 1)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Progresso Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.weeklyActivity.map((day, index) => {
              const date = new Date(day.date)
              const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
              const progress = (day.points / maxPoints) * 100
              
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-12 text-sm text-muted-foreground">
                    {dayName}
                  </div>
                  <div className="flex-1">
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="w-16 text-sm font-medium text-right">
                    {day.points} pts
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total da semana:</span>
              <span className="font-bold">
                {stats.weeklyActivity.reduce((sum, day) => sum + day.points, 0)} pontos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-20" />
                      <div className="h-8 bg-muted rounded w-16" />
                    </div>
                    <div className="h-12 w-12 bg-muted rounded-full" />
                  </div>
                  <div className="h-2 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification System */}
      <NotificationSystem />
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Nível Atual"
          value={stats?.currentLevel || 1}
          icon={Star}
          description={`${stats?.experiencePoints || 0}/${stats?.nextLevelPoints || 100} XP`}
          progress={stats?.levelProgress || 0}
          color="blue"
        />
        
        <StatCard
          title="Pontos Totais"
          value={stats?.totalPoints?.toLocaleString() || '0'}
          icon={Zap}
          description={`+${stats?.recentPointsEarned || 0} esta semana`}
          color="green"
        />
        
        <StatCard
          title="Conquistas"
          value={`${stats?.unlockedAchievements || 0}/${stats?.totalAchievements || 0}`}
          icon={Trophy}
          progress={stats?.achievementProgress || 0}
          color="purple"
        />
        
        <StatCard
          title="Medalhas"
          value={`${stats?.earnedBadges || 0}/${stats?.totalBadges || 0}`}
          icon={Medal}
          progress={stats?.badgeProgress || 0}
          color="orange"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Points and Level Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PointsDisplay compact={true} showTransactions={false} />
            <LevelProgress />
          </div>
          
          {/* Recent Activity and Weekly Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity />
            <WeeklyProgress />
          </div>
          
          {/* Badge Collection Preview */}
          <BadgeCollection compact={true} showFilters={false} />
          
          {/* Streaks */}
          {stats?.streaks && stats.streaks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Sequências Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.streaks.filter(s => s.isActive).map((streak) => (
                    <div key={streak.type} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium capitalize">
                          {streak.type.replace('_', ' ')}
                        </p>
                        <Badge variant={streak.isActive ? 'default' : 'secondary'}>
                          {streak.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">{streak.currentStreak}</p>
                        <p className="text-xs text-muted-foreground">
                          Recorde: {streak.longestStreak} dias
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <BadgeCollection showFilters={true} />
          <ExpandedAchievementDashboard />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardCenter />
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard userId={userId} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {/* Points Display with Full Transactions */}
          <PointsDisplay showTransactions={true} />
          
          {/* Level Progress */}
          <LevelProgress />
          
          {/* Category Progress */}
          {stats?.categoryProgress && (
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.categoryProgress.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {category.unlocked}/{category.total}
                        </span>
                      </div>
                      <Progress value={category.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posição no Ranking</span>
                  <span className="font-bold">#{stats?.leaderboardRank || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sequências Ativas</span>
                  <span className="font-bold">{stats?.activeStreaks || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Maior Sequência</span>
                  <span className="font-bold">{stats?.longestStreak || 0} dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pontos Disponíveis</span>
                  <span className="font-bold">{userPoints?.totalPoints?.toLocaleString() || '0'}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Conquistas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">{userAchievements?.length || 0}</div>
                  <p className="text-sm text-muted-foreground mb-4">
                    de {achievements?.length || 0} conquistas desbloqueadas
                  </p>
                  <Progress 
                    value={achievements?.length ? (userAchievements?.length / achievements.length) * 100 : 0} 
                    className="h-3 mb-2" 
                  />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    {((achievements?.length || 0) - (userAchievements?.length || 0))} conquistas restantes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
