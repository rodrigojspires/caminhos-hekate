'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Trophy, 
  Award, 
  Flame, 
  TrendingUp, 
  Calendar,
  Star,
  Target,
  Zap,
  Crown,
  Medal,
  Gift
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { AchievementRarity } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfileProps {
  userId?: string;
  showPrivateInfo?: boolean;
  className?: string;
}

const LEVEL_CONFIG = {
  1: { name: 'Iniciante', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: User },
  2: { name: 'Aprendiz', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Target },
  3: { name: 'Estudante', color: 'text-green-600', bgColor: 'bg-green-100', icon: Star },
  4: { name: 'Praticante', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Zap },
  5: { name: 'Especialista', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Medal },
  6: { name: 'Mestre', color: 'text-red-600', bgColor: 'bg-red-100', icon: Crown },
  7: { name: 'Grão-Mestre', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Trophy }
};

const RARITY_CONFIG = {
  common: { label: 'Comum', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  rare: { label: 'Raro', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  epic: { label: 'Épico', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  legendary: { label: 'Lendário', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  mythic: { label: 'Mítico', color: 'text-red-600', bgColor: 'bg-red-100' }
};

function calculateLevelProgress(currentPoints: number, level: number) {
  const pointsForCurrentLevel = (level - 1) * 1000;
  const pointsForNextLevel = level * 1000;
  const progressPoints = currentPoints - pointsForCurrentLevel;
  const totalPointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
  
  return {
    progress: Math.min((progressPoints / totalPointsNeeded) * 100, 100),
    pointsToNext: Math.max(pointsForNextLevel - currentPoints, 0),
    currentLevelPoints: progressPoints,
    totalPointsNeeded
  };
}

export function UserProfile({ 
  userId, 
  showPrivateInfo = true, 
  className 
}: UserProfileProps) {
  const {
    userStats,
    achievements,
    userStreak,
    leaderboardPosition,
    isLoadingStats,
    isLoadingAchievements,
    isLoadingStreak,
    fetchUserStats,
    fetchAchievements,
    fetchUserStreak
  } = useGamificationStore();

  React.useEffect(() => {
    if (showPrivateInfo) {
      fetchUserStats();
      fetchAchievements();
      fetchUserStreak();
    }
  }, [showPrivateInfo, fetchUserStats, fetchAchievements, fetchUserStreak]);

  const isLoading = isLoadingStats || isLoadingAchievements || isLoadingStreak;
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = userStats;
  const currentLevel = stats?.currentLevel || 1;
  const levelConfig = LEVEL_CONFIG[currentLevel as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
  const LevelIcon = levelConfig.icon;
  
  const levelProgress = stats ? calculateLevelProgress(stats.totalPoints, currentLevel) : null;
  
  const achievementsByRarity = achievements?.reduce((acc, achievement) => {
    const key = achievement.rarity as AchievementRarity;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<AchievementRarity, number>) || {};

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" />
            <AvatarFallback className="text-lg font-bold">
              U
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">Usuário</h3>
              <Badge 
                variant="secondary" 
                className={cn('flex items-center gap-1', levelConfig.bgColor, levelConfig.color)}
              >
                <LevelIcon className="h-3 w-3" />
                Nível {currentLevel} - {levelConfig.name}
              </Badge>
            </div>
            
            {showPrivateInfo && stats && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {stats.totalPoints.toLocaleString()} pontos
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {stats.achievementsCount} conquistas
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4" />
                  {stats.currentStreak} dias de sequência
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Level Progress */}
        {showPrivateInfo && stats && levelProgress && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progresso do Nível
              </h4>
              <span className="text-sm text-muted-foreground">
                {levelProgress.pointsToNext > 0 
                  ? `${levelProgress.pointsToNext.toLocaleString()} pontos para o próximo nível`
                  : 'Nível máximo atingido!'
                }
              </span>
            </div>
            
            <Progress value={levelProgress.progress} className="h-2 mb-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{levelProgress.currentLevelPoints.toLocaleString()}</span>
              <span>{levelProgress.totalPointsNeeded.toLocaleString()}</span>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Statistics Grid */}
        {showPrivateInfo && stats && (
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Estatísticas
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pontos Totais</p>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.achievementsCount}</p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Flame className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Sequência Atual</p>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.longestStreak}</p>
                <p className="text-xs text-muted-foreground">Maior Sequência</p>
              </div>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Achievements by Rarity */}
        {showPrivateInfo && Object.keys(achievementsByRarity).length > 0 && (
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Conquistas por Raridade
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(RARITY_CONFIG).map(([rarity, config]) => {
                const count = achievementsByRarity[rarity as AchievementRarity] || 0;
                
                return (
                  <div 
                    key={rarity}
                    className={cn(
                      'text-center p-3 rounded-lg border',
                      config.bgColor,
                      count > 0 ? 'border-current' : 'border-muted'
                    )}
                  >
                    <Award className={cn('h-5 w-5 mx-auto mb-2', config.color)} />
                    <p className={cn('text-lg font-bold', config.color)}>{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Ranking Position */}
        {showPrivateInfo && leaderboardPosition && (
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Posição no Ranking
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                <p className="text-xl font-bold">#{leaderboardPosition.general ?? '-'}</p>
                <p className="text-xs text-muted-foreground">Geral</p>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Award className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                <p className="text-xl font-bold">#{leaderboardPosition.learning ?? '-'}</p>
                <p className="text-xs text-muted-foreground">Aprendizado</p>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600 mx-auto mb-2" />
                <p className="text-xl font-bold">#{leaderboardPosition.engagement ?? '-'}</p>
                <p className="text-xs text-muted-foreground">Engajamento</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Recent Activity - optional: use RecentActivity component externally if needed */}
        
        {/* Action Buttons */}
        {showPrivateInfo && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1">
              Ver Todas as Conquistas
            </Button>
            <Button variant="outline" className="flex-1">
              Histórico Completo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UserProfile;
