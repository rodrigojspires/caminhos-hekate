'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGamification } from '@/hooks/useGamification'
import { useActivityTracker } from '@/hooks/useActivityTracker'
import { NotificationSystem } from './NotificationSystem'
import { Trophy, Star, Target, Zap, Users, Gift, TrendingUp, Award } from 'lucide-react'
import { toast } from 'sonner'

interface GamificationIntegrationProps {
  userId: string
  showNotifications?: boolean
  compactMode?: boolean
}

/**
 * Complete gamification integration component
 * Demonstrates how to use all gamification systems together
 */
export function GamificationIntegration({
  userId,
  showNotifications = true,
  compactMode = false
}: GamificationIntegrationProps) {
  const { data: session } = useSession()
  const {
    userPoints,
    achievements,
    badges,
    userStreaks,
    notifications,
    leaderboard,
    loading,
    markNotificationAsRead,
    awardPoints,
    updateStreak,
    processActivity,
    refreshUserPoints,
    refreshAchievements,
    refreshUserStreaks,
    refreshBadges,
    refreshNotifications,
    refreshLeaderboard,
    refreshStats,
  } = useGamification()

  const refreshData = async () => {
    await Promise.all([
      refreshUserPoints(),
      refreshAchievements(),
      refreshUserStreaks(),
      refreshBadges(),
      refreshNotifications(),
      refreshLeaderboard(),
      refreshStats(),
    ])
  }

  const {
    trackActivity,
    trackProfileComplete,
    trackCourseComplete,
    trackGroupJoin,
    trackCommentPost,
    trackContentShare,
    isTracking
  } = useActivityTracker()

  const [demoMode, setDemoMode] = useState(false)

  // Demo activities for testing
  const demoActivities = [
    {
      name: 'Completar Perfil',
      description: 'Simula completar 100% do perfil',
      action: () => trackProfileComplete(100),
      icon: <Target className="h-4 w-4" />
    },
    {
      name: 'Finalizar Curso',
      description: 'Simula completar um curso',
      action: () => trackCourseComplete('demo-course', 'Curso de Demonstração'),
      icon: <Trophy className="h-4 w-4" />
    },
    {
      name: 'Entrar em Grupo',
      description: 'Simula entrar em um grupo privado',
      action: () => trackGroupJoin('demo-group', 'Grupo de Demonstração'),
      icon: <Users className="h-4 w-4" />
    },
    {
      name: 'Fazer Comentário',
      description: 'Simula fazer um comentário',
      action: () => trackCommentPost('demo-content', 'course'),
      icon: <Zap className="h-4 w-4" />
    },
    {
      name: 'Compartilhar Conteúdo',
      description: 'Simula compartilhar conteúdo',
      action: () => trackContentShare('demo-content', 'whatsapp'),
      icon: <TrendingUp className="h-4 w-4" />
    }
  ]

  const handleDemoActivity = async (activity: typeof demoActivities[0]) => {
    try {
      await activity.action()
      await refreshData()
      toast.success(`Atividade "${activity.name}" executada com sucesso!`)
    } catch (error) {
      toast.error('Erro ao executar atividade de demonstração')
    }
  }

  const unreadNotifications = notifications?.filter(n => !n.read) || []
  const recentAchievements = achievements?.filter(a => a.unlockedAt).slice(0, 3) || []
  const activeBadges = badges?.filter(b => b.earnedAt).slice(0, 5) || []
  const activeStreaks = userStreaks?.filter(s => s.isActive) || []

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando gamificação...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compactMode) {
    return (
      <div className="space-y-4">
        {showNotifications && <NotificationSystem />}
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nível {userPoints?.currentLevel || 1}</span>
              <span className="text-sm text-muted-foreground">
                {userPoints?.totalPoints || 0} pontos
              </span>
            </div>
            <Progress 
              value={userPoints?.pointsToNext ? ((userPoints.totalPoints % 1000) / 10) : 0} 
              className="h-2"
            />
            
            <div className="flex gap-2 flex-wrap">
              {activeBadges.slice(0, 3).map((badge) => (
                <Badge key={badge.id} variant="secondary" className="text-xs">
                  {badge.name}
                </Badge>
              ))}
              {activeBadges.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{activeBadges.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showNotifications && <NotificationSystem />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Points & Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Pontos & Nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{userPoints?.totalPoints || 0}</div>
              <div className="text-sm text-muted-foreground">Nível {userPoints?.currentLevel || 1}</div>
              <Progress value={userPoints?.pointsToNext ? ((userPoints.totalPoints % 1000) / 10) : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-500" />
              Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {achievements?.filter(a => a.unlockedAt).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                de {achievements?.length || 0} disponíveis
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Medalhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{activeBadges.length}</div>
              <div className="text-sm text-muted-foreground">conquistadas</div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{unreadNotifications.length}</div>
              <div className="text-sm text-muted-foreground">não lidas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="streaks">Sequências</TabsTrigger>
          <TabsTrigger value="demo">Demonstração</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Conquistas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAchievements.length > 0 ? (
                  <div className="space-y-3">
                    {recentAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {achievement.description}
                          </div>
                        </div>
                        <Badge variant={achievement.rarity === 'LEGENDARY' ? 'default' : 'secondary'}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma conquista recente
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Streaks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Sequências Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeStreaks.length > 0 ? (
                  <div className="space-y-3">
                    {activeStreaks.map((streak: any) => (
                      <div key={streak.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium capitalize">{streak.type.toLowerCase()}</div>
                          <div className="text-sm text-muted-foreground">
                            Última atividade: {new Date(streak.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-500">{streak.currentCount}</div>
                          <div className="text-xs text-muted-foreground">dias</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma sequência ativa
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Conquistas</CardTitle>
              <CardDescription>
                {achievements?.filter(a => a.unlockedAt).length || 0} de {achievements?.length || 0} conquistadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements?.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 rounded-lg border ${achievement.unlockedAt ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-muted'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl opacity-70">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {achievement.description}
                        </div>
                        {achievement.unlockedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Conquistada em {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge variant={achievement.rarity === 'LEGENDARY' ? 'default' : 'secondary'}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequências de Atividades</CardTitle>
              <CardDescription>
                Mantenha suas atividades consistentes para ganhar mais pontos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userStreaks?.map((streak: any) => (
                  <div key={streak.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">{streak.type.toLowerCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          {streak.isActive ? 'Ativa' : 'Inativa'} • 
                          Melhor sequência: {streak.bestStreak} dias
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${streak.isActive ? 'text-orange-500' : 'text-muted-foreground'}`}>
                          {streak.currentCount}
                        </div>
                        <div className="text-xs text-muted-foreground">dias atuais</div>
                      </div>
                    </div>
                    {streak.lastActivity && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Última atividade: {new Date(streak.lastActivity).toLocaleString()}
                      </div>
                    )}
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demonstração do Sistema</CardTitle>
              <CardDescription>
                Teste as funcionalidades de gamificação com atividades simuladas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demoActivities.map((activity, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {activity.icon}
                        <div>
                          <div className="font-medium">{activity.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.description}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleDemoActivity(activity)}
                        disabled={isTracking}
                        className="w-full"
                        size="sm"
                      >
                        {isTracking ? 'Processando...' : 'Executar'}
                      </Button>
                    </Card>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    onClick={refreshData}
                    variant="outline"
                    className="w-full"
                  >
                    Atualizar Dados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
