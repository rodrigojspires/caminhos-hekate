'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface AchievementBadgeProps {
  achievement: Achievement & { userAchievement?: UserAchievement };
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

const RARITY_CONFIG: Record<AchievementRarity, {
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
}> = {
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
};

const SIZE_CONFIG = {
  sm: {
    card: 'p-3',
    icon: 'h-6 w-6',
    title: 'text-sm font-medium',
    description: 'text-xs',
    badge: 'text-xs'
  },
  md: {
    card: 'p-4',
    icon: 'h-8 w-8',
    title: 'text-base font-semibold',
    description: 'text-sm',
    badge: 'text-sm'
  },
  lg: {
    card: 'p-6',
    icon: 'h-10 w-10',
    title: 'text-lg font-bold',
    description: 'text-base',
    badge: 'text-base'
  }
};

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

export function AchievementBadge({ 
  achievement, 
  size = 'md', 
  showProgress = true,
  className 
}: AchievementBadgeProps) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const sizeConfig = SIZE_CONFIG[size];
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn(
            'transition-all duration-200 hover:shadow-md cursor-pointer',
            isUnlocked ? rarityConfig.bgColor : 'bg-gray-50',
            isUnlocked ? rarityConfig.borderColor : 'border-gray-200',
            !isUnlocked && 'opacity-60',
            className
          )}>
            <CardContent className={sizeConfig.card}>
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                  'p-2 rounded-full border-2 flex-shrink-0',
                  isUnlocked ? rarityConfig.bgColor : 'bg-gray-100',
                  isUnlocked ? rarityConfig.borderColor : 'border-gray-300'
                )}>
                  {isUnlocked ? (
                    <IconComponent className={cn(
                      sizeConfig.icon,
                      rarityConfig.color
                    )} />
                  ) : (
                    <Lock className={cn(
                      sizeConfig.icon,
                      'text-gray-400'
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={cn(
                      sizeConfig.title,
                      isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {achievement.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isUnlocked && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          sizeConfig.badge,
                          isUnlocked ? rarityConfig.badgeColor : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {getRarityLabel(achievement.rarity)}
                      </Badge>
                    </div>
                  </div>

                  <p className={cn(
                    sizeConfig.description,
                    'text-muted-foreground mb-3 line-clamp-2'
                  )}>
                    {achievement.description}
                  </p>

                  {/* Progress */}
                  {showProgress && !isUnlocked && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>
                          {progress.toLocaleString()} / {target.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}

                  {/* Unlock info */}
                  {isUnlocked && unlockedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        Desbloqueado {formatDistanceToNow(new Date(unlockedAt), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  )}

                  {/* Points reward */}
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-xs">
                      +{achievement.points} pontos
                    </Badge>
                    
                    {achievement.category && (
                      <Badge variant="secondary" className="text-xs">
                        {achievement.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{achievement.name}</p>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            
            {achievement.criteria && (
              <div className="text-xs">
                <p className="font-medium mb-1">Critério:</p>
                <p>{getCriteriaLabel(achievement)}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs pt-2 border-t">
              <span>Recompensa: +{achievement.points} pontos</span>
              <span className="capitalize">{getRarityLabel(achievement.rarity)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AchievementBadge;