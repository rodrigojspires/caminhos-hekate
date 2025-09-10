'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Award, 
  Star, 
  Zap, 
  Crown, 
  Sparkles, 
  TrendingUp,
  Calendar,
  Target,
  Medal,
  Gift,
  Users,
  Clock,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGamificationStore } from '@/stores/gamificationStore'
import { cn } from '@/lib/utils'

interface AchievementStats {
  totalAchievements: number
  unlockedAchievements: number
  totalBadges: number
  earnedBadges: number
  totalPoints: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
  recentActivity: Array<{
    id: string
    type: string
    title: string
    points: number
    date: string
    rarity?: string
  }>
  categoryProgress: Array<{
    category: string
    total: number
    unlocked: number
    percentage: number
  }>
  rarityDistribution: Array<{
    rarity: string
    count: number
    color: string
  }>
  weeklyProgress: Array<{
    day: string
    points: number
    achievements: number
  }>
}

const rarityConfig = {
  COMMON: { color: 'bg-gray-500', textColor: 'text-gray-700', icon: Star },
  UNCOMMON: { color: 'bg-green-500', textColor: 'text-green-700', icon: Award },
  RARE: { color: 'bg-blue-500', textColor: 'text-blue-700', icon: Trophy },
  EPIC: { color: 'bg-purple-500', textColor: 'text-purple-700', icon: Crown },
  LEGENDARY: { color: 'bg-orange-500', textColor: 'text-orange-700', icon: Crown },
  MYTHIC: { color: 'bg-pink-500', textColor: 'text-pink-700', icon: Sparkles }
}

const StatCard: React.FC<{
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: string
  trend?: number
}> = ({ title, value, subtitle, icon: Icon, color = 'text-blue-500', trend }) => {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend !== undefined && (
                <span className={cn(
                  "text-sm font-medium flex items-center",
                  trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
                )}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-opacity-10", color)}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const AchievementCard: React.FC<{
  achievement: {
    id: string
    name: string
    description: string
    rarity: string
    points: number
    unlocked?: boolean
    unlockedAt?: string
    progress?: number
    maxProgress?: number
  }
}> = ({ achievement }) => {
  const config = rarityConfig[achievement.rarity as keyof typeof rarityConfig] || rarityConfig.COMMON
  const IconComponent = config.icon

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "p-4 rounded-lg border-2 transition-all duration-200",
        achievement.unlocked 
          ? "bg-white border-gray-200 shadow-sm" 
          : "bg-gray-50 border-gray-100 opacity-60"
      )}
    >
      <div className="flex items-start space-x-3">
        <div className={cn(
          "p-2 rounded-full",
          achievement.unlocked ? config.color : "bg-gray-300"
        )}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              "font-semibold text-sm",
              achievement.unlocked ? "text-gray-900" : "text-gray-500"
            )}>
              {achievement.name}
            </h3>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={cn(
                "text-xs",
                achievement.unlocked ? config.textColor : "text-gray-400"
              )}>
                {achievement.rarity}
              </Badge>
              
              <span className={cn(
                "text-xs font-medium",
                achievement.unlocked ? "text-yellow-600" : "text-gray-400"
              )}>
                {achievement.points} pts
              </span>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mb-2">
            {achievement.description}
          </p>
          
          {achievement.unlocked ? (
            <p className="text-xs text-green-600 font-medium">
              Desbloqueado em {new Date(achievement.unlockedAt!).toLocaleDateString('pt-BR')}
            </p>
          ) : achievement.progress !== undefined && achievement.maxProgress ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progresso</span>
                <span>{achievement.progress}/{achievement.maxProgress}</span>
              </div>
              <Progress 
                value={(achievement.progress / achievement.maxProgress) * 100} 
                className="h-2"
              />
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Não desbloqueado
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export const ExpandedAchievementDashboard: React.FC = () => {
  const [stats, setStats] = useState<AchievementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { userStats, achievements, userAchievements } = useGamificationStore()

  useEffect(() => {
    // Carregar dados reais da API
    const loadStats = async () => {
      setLoading(true)
      
      try {
        // Buscar estatísticas de gamificação
        const statsResponse = await fetch('/api/gamification/stats')
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch stats')
        }
        const statsData = await statsResponse.json()
        
        // Fetch achievements from API
        const achievements = statsData?.achievements || []
        
        // Converter dados da API para o formato esperado
        const convertedStats: AchievementStats = {
          totalAchievements: statsData.totalAchievements,
          unlockedAchievements: statsData.unlockedAchievements,
          totalBadges: statsData.totalBadges,
          earnedBadges: statsData.earnedBadges,
          totalPoints: statsData.totalPoints,
          currentLevel: statsData.currentLevel,
          currentStreak: statsData.activeStreaks,
          longestStreak: statsData.longestStreak,
          recentActivity: [
            ...statsData.recentAchievements.map((achievement: any) => ({
              id: achievement.id,
              type: 'achievement',
              title: achievement.title,
              points: achievement.points,
              date: achievement.unlockedAt,
              rarity: achievement.rarity
            })),
            ...statsData.recentBadges.map((badge: any) => ({
              id: badge.id,
              type: 'badge',
              title: badge.name,
              points: 0, // Badges não têm pontos diretos
              date: badge.earnedAt,
              rarity: badge.rarity
            }))
          ],
          categoryProgress: statsData.categoryProgress.map((cat: any) => ({
            category: cat.name,
            total: cat.total,
            unlocked: cat.unlocked,
            percentage: cat.progress
          })),
          rarityDistribution: statsData.rarityDistribution || [
            { rarity: 'common', count: 0, percentage: 0 },
            { rarity: 'rare', count: 0, percentage: 0 },
            { rarity: 'epic', count: 0, percentage: 0 },
            { rarity: 'legendary', count: 0, percentage: 0 }
          ],
          weeklyProgress: statsData.weeklyActivity.map((day: any) => ({
            day: new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
            points: day.points,
            achievements: day.achievements || 0
          }))
        }
        
        setStats(convertedStats)
      } catch (error) {
        console.error('Error loading gamification stats:', error)
        // Fallback para dados básicos se a API falhar
        setStats({
          totalAchievements: 0,
          unlockedAchievements: 0,
          totalBadges: 0,
          earnedBadges: 0,
          totalPoints: 0,
          currentLevel: 1,
          currentStreak: 0,
          longestStreak: 0,
          recentActivity: [],
          categoryProgress: [],
          rarityDistribution: [],
          weeklyProgress: []
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conquistas"
          value={`${stats.unlockedAchievements}/${stats.totalAchievements}`}
          subtitle={`${Math.round((stats.unlockedAchievements / stats.totalAchievements) * 100)}% completo`}
          icon={Trophy}
          color="text-yellow-500"
          trend={12}
        />
        
        <StatCard
          title="Badges"
          value={`${stats.earnedBadges}/${stats.totalBadges}`}
          subtitle={`${Math.round((stats.earnedBadges / stats.totalBadges) * 100)}% completo`}
          icon={Award}
          color="text-blue-500"
          trend={8}
        />
        
        <StatCard
          title="Nível Atual"
          value={stats.currentLevel}
          subtitle={`${stats.totalPoints} pontos totais`}
          icon={Zap}
          color="text-green-500"
          trend={5}
        />
        
        <StatCard
          title="Sequência"
          value={`${stats.currentStreak} dias`}
          subtitle={`Recorde: ${stats.longestStreak} dias`}
          icon={Target}
          color="text-orange-500"
          trend={stats.currentStreak > stats.longestStreak * 0.8 ? 15 : -5}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Suas Conquistas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {/* Real achievements from API */}
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Medal className="w-5 h-5" />
                <span>Coleção de Badges</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {userAchievements && userAchievements.length > 0 ? (
                  userAchievements
                    .filter((ua) => !!ua.achievement)
                    .map((ua) => {
                      const ach = ua.achievement!;
                      return (
                        <div key={ua.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{ach.name}</h4>
                              <p className="text-sm text-muted-foreground">{ach.description}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{ach.rarity}</Badge>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum badge conquistado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Progresso por Categoria</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.categoryProgress.map((category) => (
                  <div key={category.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{category.category}</span>
                      <span>{category.unlocked}/{category.total}</span>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Progresso Semanal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.weeklyProgress.map((day) => (
                    <div key={day.day} className="flex items-center justify-between p-2 rounded bg-gray-50">
                      <span className="text-sm font-medium">{day.day}</span>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-yellow-600">{day.points} pts</span>
                        <span className="text-blue-600">{day.achievements} conquistas</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Atividade Recente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        activity.type === 'achievement' ? 'bg-yellow-100 text-yellow-600' :
                        activity.type === 'badge' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      )}>
                        {activity.type === 'achievement' ? <Trophy className="w-4 h-4" /> :
                         activity.type === 'badge' ? <Award className="w-4 h-4" /> :
                         <Target className="w-4 h-4" />}
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-sm text-yellow-600">+{activity.points}</p>
                      {activity.rarity && (
                        <Badge variant="outline" className="text-xs">
                          {activity.rarity}
                        </Badge>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atividade recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ExpandedAchievementDashboard
