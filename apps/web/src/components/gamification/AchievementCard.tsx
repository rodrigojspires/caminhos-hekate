'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Crown, 
  Gem, 
  Award,
  Lock,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Achievement, AchievementRarity, UserAchievement } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AchievementCardProps {
  achievement: Achievement & { userAchievement?: UserAchievement };
  className?: string;
}

const RARITY_CONFIG = {
  COMMON: {
    icon: Award,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700'
  },
  UNCOMMON: {
    icon: Star,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-700'
  },
  RARE: {
    icon: Trophy,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  EPIC: {
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  LEGENDARY: {
    icon: Gem,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-700'
  }
} as const

function getRarityLabel(rarity: AchievementRarity) {
  switch (rarity) {
    case 'COMMON': return 'Comum';
    case 'UNCOMMON': return 'Incomum';
    case 'RARE': return 'Raro';
    case 'EPIC': return 'Épico';
    case 'LEGENDARY': return 'Lendário';
    default: return 'Comum';
  }
}

function getCriteriaLabel(achievement: Achievement) {
  const { type, target } = achievement.criteria;
  switch (type) {
    case 'course_completion':
      return `Complete ${target} curso(s)`;
    case 'consecutive_days':
      return `Mantenha ${target} dia(s) consecutivo(s)`;
    case 'total_points':
      return `Alcance ${target} ponto(s)`;
    case 'video_hours':
      return `Assista ${target} hora(s) de vídeo`;
    case 'comments_count':
      return `Publique ${target} comentário(s)`;
    case 'custom':
    default:
      return `Objetivo: ${target}`;
  }
}

export function AchievementCard({ achievement, className }: AchievementCardProps) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const IconComponent = rarityConfig.icon;
  
  const unlockedAt = achievement.userAchievement?.unlockedAt;
  const isUnlocked = Boolean(unlockedAt);
  const metadata = achievement.userAchievement?.metadata as { progress?: number } | undefined;
  const progress = typeof metadata?.progress === 'number' ? metadata!.progress : 0;
  
  const target = achievement.criteria?.target ?? 0;
  const progressPercentage = target > 0 
    ? Math.min((progress / target) * 100, 100)
    : 0;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-lg cursor-pointer',
      isUnlocked ? rarityConfig.bgColor : 'bg-gray-50',
      isUnlocked ? rarityConfig.borderColor : 'border-gray-200',
      !isUnlocked && 'opacity-70',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-3 rounded-full border-2',
              isUnlocked ? rarityConfig.bgColor : 'bg-gray-100',
              isUnlocked ? rarityConfig.borderColor : 'border-gray-300'
            )}>
              {isUnlocked ? (
                <IconComponent className={cn(
                  'h-6 w-6',
                  rarityConfig.color
                )} />
              ) : (
                <Lock className="h-6 w-6 text-gray-400" />
              )}
            </div>
            
            <div>
              <CardTitle className={cn(
                'text-lg',
                isUnlocked ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {achievement.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs',
                    isUnlocked ? rarityConfig.badgeColor : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {getRarityLabel(achievement.rarity)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  +{achievement.points} pontos
                </Badge>
              </div>
            </div>
          </div>
          
          {isUnlocked && (
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          {achievement.description}
        </p>
        
        {achievement.criteria && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Critério:
            </p>
            <p className="text-sm">
              {getCriteriaLabel(achievement)}
            </p>
          </div>
        )}
        
        {/* Progress */}
        {!isUnlocked && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>
                {progress.toLocaleString()} / {target.toLocaleString()}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          {achievement.category && (
            <Badge variant="secondary" className="text-xs">
              {achievement.category.name}
            </Badge>
          )}
          
          {isUnlocked && unlockedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Desbloqueado {formatDistanceToNow(new Date(unlockedAt), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AchievementCard;