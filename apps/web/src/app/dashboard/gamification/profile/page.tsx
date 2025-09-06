'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Trophy, 
  Award, 
  Flame, 
  Star, 
  TrendingUp, 
  Calendar, 
  Target, 
  Zap,
  Crown,
  Medal,
  Gift,
  Activity,
  BarChart3,
  Settings,
  Share2
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { AchievementBadge } from '@/components/gamification/achievements/AchievementBadge';
import { StreakDisplay } from '@/components/gamification/streaks/StreakDisplay';
import { ProgressChart } from '@/components/gamification/charts/ProgressChart';
import { RecentActivity } from '@/components/gamification/dashboard/RecentActivity';
import { LevelProgress } from '@/components/gamification/dashboard/LevelProgress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RARITY_CONFIG = {
  common: { label: 'Comum', color: 'text-gray-600', bgColor: 'bg-gray-100', count: 0 },
  rare: { label: 'Raro', color: 'text-blue-600', bgColor: 'bg-blue-100', count: 0 },
  epic: { label: 'Épico', color: 'text-purple-600', bgColor: 'bg-purple-100', count: 0 },
  legendary: { label: 'Lendário', color: 'text-yellow-600', bgColor: 'bg-yellow-100', count: 0 },
  mythic: { label: 'Mítico', color: 'text-pink-600', bgColor: 'bg-pink-100', count: 0 }
} as const;

type RarityKey = keyof typeof RARITY_CONFIG;

const LEVEL_CONFIG = {
  1: { title: 'Iniciante', benefits: ['Acesso básico à plataforma'] },
  5: { title: 'Explorador', benefits: ['Acesso a conteúdo intermediário', 'Badge de Explorador'] },
  10: { title: 'Estudioso', benefits: ['Acesso a cursos avançados', 'Desconto em certificações'] },
  15: { title: 'Especialista', benefits: ['Acesso a mentoria', 'Conteúdo exclusivo'] },
  20: { title: 'Mestre', benefits: ['Acesso total', 'Certificação premium', 'Comunidade VIP'] }
};

function getLevelInfo(level: number) {
  const levelKeys = Object.keys(LEVEL_CONFIG).map(Number).sort((a, b) => b - a);
  const currentLevelKey = levelKeys.find(key => level >= key) || 1;
  return LEVEL_CONFIG[currentLevelKey as keyof typeof LEVEL_CONFIG];
}

export default function ProfilePage() {
  const { 
    userStats,
    achievements,
    userAchievements,
    userStreak,
    leaderboardPosition,
    recentTransactions,
    isLoadingPoints,
    isLoadingAchievements,
    isLoadingStreak,
    isLoadingStats,
    fetchUserStats,
    fetchAchievements,
    fetchUserStreak,
    fetchUserPoints,
  } = useGamificationStore();

  const isLoading = isLoadingPoints || isLoadingAchievements || isLoadingStreak || isLoadingStats;

  React.useEffect(() => {
    fetchUserStats();
    fetchAchievements();
    fetchUserStreak();
    fetchUserPoints();
  }, [fetchUserStats, fetchAchievements, fetchUserStreak, fetchUserPoints]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Acompanhe seu progresso e conquistas
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const levelInfo = userStats ? getLevelInfo(userStats.currentLevel) : null;
  const nextLevelKey = userStats ? 
    Object.keys(LEVEL_CONFIG).map(Number).find(key => key > userStats.currentLevel) : null;
  const nextLevelInfo = nextLevelKey ? LEVEL_CONFIG[nextLevelKey as keyof typeof LEVEL_CONFIG] : null;
  
  // Calculate achievement stats by rarity
  const achievementsByRarity: Record<RarityKey, { label: string; color: string; bgColor: string; count: number }> = { ...RARITY_CONFIG } as any;
  if (achievements && userAchievements) {
    userAchievements.forEach(userAch => {
      const achievement = achievements.find(ach => ach.id === userAch.achievementId);
      if (achievement && userAch.unlockedAt) {
        const rarity = achievement.rarity as RarityKey;
        achievementsByRarity[rarity].count++;
      }
    });
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e conquistas na plataforma
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>
      
      {/* Profile Header */}
      {userStats && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl font-bold">
                    U
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h2 className="text-2xl font-bold">Usuário</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Nível {userStats.currentLevel}
                    </Badge>
                    {levelInfo && (
                      <Badge variant="outline">
                        {levelInfo.title}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Membro desde {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pontos</p>
                </div>
                
                <div className="text-center">
                  <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{userStats.achievementsCount}</p>
                  <p className="text-sm text-muted-foreground">Conquistas</p>
                </div>
                
                <div className="text-center">
                  <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{userStats.currentStreak}</p>
                  <p className="text-sm text-muted-foreground">Sequência</p>
                </div>
                
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {leaderboardPosition?.general ? `#${leaderboardPosition.general}` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Ranking</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Level Progress */}
      {userStats && (
        <LevelProgress />
      )}
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Conquistas
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividade
          </TabsTrigger>
          <TabsTrigger value="streaks" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Sequências
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progresso
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Achievements by Rarity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Conquistas por Raridade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(achievementsByRarity).map(([rarity, config]) => (
                    <div key={rarity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <Badge variant="outline">{config.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Ranking Positions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Posições no Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Pontos</span>
                    </div>
                    <Badge variant="outline">
                      {leaderboardPosition?.general ? `#${leaderboardPosition.general}` : '-'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Conquistas</span>
                    </div>
                    <Badge variant="outline">
                      {leaderboardPosition?.learning ? `#${leaderboardPosition.learning}` : '-'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Sequências</span>
                    </div>
                    <Badge variant="outline">
                      {leaderboardPosition?.engagement ? `#${leaderboardPosition.engagement}` : '-'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Level Benefits */}
            {levelInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Benefícios do Nível
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {levelInfo.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  
                  {nextLevelInfo && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Próximo nível: {nextLevelInfo.title}
                      </p>
                      <div className="space-y-1">
                        {nextLevelInfo.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2 opacity-60">
                            <Gift className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements && userAchievements && achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {achievements.map(achievement => {
                    const userAchievement = userAchievements.find(
                      ua => ua.achievementId === achievement.id
                    );
                    
                    return (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={{ ...achievement, userAchievement }}
                        showProgress
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhuma conquista ainda
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete atividades para desbloquear suas primeiras conquistas!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <RecentActivity />
        </TabsContent>
        
        {/* Streaks Tab */}
        <TabsContent value="streaks" className="space-y-6">
          <StreakDisplay />
        </TabsContent>
        
        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <ProgressChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}