'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Star,
  Flame,
  Users,
  Target,
  Crown,
  ChevronUp,
  ChevronDown,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardEntry, LeaderboardCategory } from '@/types/gamification';

interface UserRankCardProps {
  userRank: LeaderboardEntry;
  category: LeaderboardCategory;
  totalUsers: number;
  previousRank?: number;
  nextRankUser?: LeaderboardEntry;
  prevRankUser?: LeaderboardEntry;
  pointsToNext?: number;
  onViewProfile?: (userId: string) => void;
  onViewFullLeaderboard?: () => void;
  className?: string;
}

const CATEGORY_CONFIG = {
  general: {
    label: 'Geral',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  learning: {
    label: 'Aprendizado',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  engagement: {
    label: 'Engajamento',
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  }
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <Trophy className="h-5 w-5 text-muted-foreground" />;
  }
}

function getRankBadgeColor(rank: number) {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
  if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
  if (rank === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
  if (rank <= 10) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
  if (rank <= 50) return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
  return 'bg-muted text-muted-foreground';
}

function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

function getRankChangeIcon(currentRank: number, previousRank?: number) {
  if (!previousRank) return <Minus className="h-4 w-4 text-muted-foreground" />;
  
  if (currentRank < previousRank) {
    return <ChevronUp className="h-4 w-4 text-green-600" />;
  }
  if (currentRank > previousRank) {
    return <ChevronDown className="h-4 w-4 text-red-600" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getRankChangeText(currentRank: number, previousRank?: number) {
  if (!previousRank) return 'Sem alteração';
  
  const change = previousRank - currentRank;
  if (change > 0) {
    return `+${change} posições`;
  }
  if (change < 0) {
    return `${change} posições`;
  }
  return 'Sem alteração';
}

function getPercentile(rank: number, totalUsers: number): number {
  return Math.round(((totalUsers - rank + 1) / totalUsers) * 100);
}

export function UserRankCard({
  userRank,
  category,
  totalUsers,
  previousRank,
  nextRankUser,
  prevRankUser,
  pointsToNext,
  onViewProfile,
  onViewFullLeaderboard,
  className
}: UserRankCardProps) {
  const categoryConfig = CATEGORY_CONFIG[category];
  const CategoryIcon = categoryConfig.icon;
  const percentile = getPercentile(userRank.rank, totalUsers);
  const progressToNext = nextRankUser && pointsToNext 
    ? Math.max(0, Math.min(100, ((nextRankUser.points - userRank.points + pointsToNext) / pointsToNext) * 100))
    : 0;
  
  return (
    <Card className={cn(
      'relative overflow-hidden',
      categoryConfig.borderColor,
      'border-2',
      className
    )}>
      {/* Header with Category and Rank */}
      <CardHeader className={cn('pb-4', categoryConfig.bgColor)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CategoryIcon className={cn('h-5 w-5', categoryConfig.color)} />
            Seu Ranking - {categoryConfig.label}
          </CardTitle>
          
          <Badge className={getRankBadgeColor(userRank.rank)}>
            #{userRank.rank}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage src={userRank.userAvatar || undefined} />
              <AvatarFallback className="text-lg font-semibold">
                {userRank.userName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            
            {/* Rank Icon Overlay */}
            <div className="absolute -top-1 -right-1 bg-background rounded-full p-1 shadow-md">
              {getRankIcon(userRank.rank)}
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {userRank.userName || 'Usuário'}
            </h3>
            <p className="text-muted-foreground text-sm">
              Nível {userRank.level} • {formatPoints(userRank.points)} pontos
            </p>
            
            {/* Rank Change */}
            <div className="flex items-center gap-1 mt-1">
              {getRankChangeIcon(userRank.rank, previousRank)}
              <span className={cn(
                'text-xs font-medium',
                previousRank && userRank.rank < previousRank && 'text-green-600',
                previousRank && userRank.rank > previousRank && 'text-red-600',
                (!previousRank || userRank.rank === previousRank) && 'text-muted-foreground'
              )}>
                {getRankChangeText(userRank.rank, previousRank)}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              #{userRank.rank}
            </div>
            <div className="text-xs text-muted-foreground">
              Top {percentile}%
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Progress to Next Rank */}
        {nextRankUser && pointsToNext && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Próximo Rank</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatPoints(pointsToNext)} pontos restantes
              </span>
            </div>
            
            <Progress value={progressToNext} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Você: {formatPoints(userRank.points)}</span>
              <span>#{nextRankUser.rank}: {formatPoints(nextRankUser.points)}</span>
            </div>
          </div>
        )}
        
        {/* Nearby Ranks */}
        {(prevRankUser || nextRankUser) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Posições Próximas
            </h4>
            
            <div className="space-y-2">
              {prevRankUser && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{prevRankUser.rank}
                    </Badge>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={prevRankUser.userAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {prevRankUser.userName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {prevRankUser.userName || 'Usuário'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatPoints(prevRankUser.points)}
                  </span>
                </div>
              )}
              
              {/* Current User */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className={getRankBadgeColor(userRank.rank)}>
                    #{userRank.rank}
                  </Badge>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={userRank.userAvatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {userRank.userName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">Você</span>
                </div>
                <span className="text-sm font-semibold">
                  {formatPoints(userRank.points)}
                </span>
              </div>
              
              {nextRankUser && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{nextRankUser.rank}
                    </Badge>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={nextRankUser.userAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {nextRankUser.userName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {nextRankUser.userName || 'Usuário'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatPoints(nextRankUser.points)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {onViewProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(userRank.userId)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Perfil
            </Button>
          )}
          
          {onViewFullLeaderboard && (
            <Button
              size="sm"
              onClick={onViewFullLeaderboard}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Ver Ranking Completo
            </Button>
          )}
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              #{userRank.rank}
            </div>
            <div className="text-xs text-muted-foreground">Posição</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              {formatPoints(userRank.points)}
            </div>
            <div className="text-xs text-muted-foreground">Pontos</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              {percentile}%
            </div>
            <div className="text-xs text-muted-foreground">Percentil</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserRankCard;