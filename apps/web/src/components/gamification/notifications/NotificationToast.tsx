'use client';

import React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Award, 
  Flame, 
  Star, 
  Crown, 
  Zap, 
  Gift,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementRarity } from '@/types/gamification';

interface NotificationData {
  type: 'achievement' | 'level_up' | 'points' | 'streak' | 'milestone';
  title: string;
  description: string;
  points?: number;
  level?: number;
  achievement?: {
    id: string;
    name: string;
    description: string;
    rarity: AchievementRarity;
    icon: string;
    points: number;
  };
  streak?: {
    current: number;
    milestone?: number;
  };
  actionLabel?: string;
  onAction?: () => void;
}

const RARITY_CONFIG: Record<AchievementRarity, { color: string; bgColor: string; borderColor: string; label: string }> = {
  COMMON: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100', 
    borderColor: 'border-gray-200',
    label: 'Comum'
  },
  UNCOMMON: { 
    color: 'text-green-600', 
    bgColor: 'bg-green-100', 
    borderColor: 'border-green-200',
    label: 'Incomum'
  },
  RARE: { 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100', 
    borderColor: 'border-blue-200',
    label: 'Raro'
  },
  EPIC: { 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100', 
    borderColor: 'border-purple-200',
    label: 'Épico'
  },
  LEGENDARY: { 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100', 
    borderColor: 'border-yellow-200',
    label: 'Lendário'
  }
};

function getNotificationIcon(type: NotificationData['type'], rarity?: AchievementRarity) {
  switch (type) {
    case 'achievement':
      return rarity === 'LEGENDARY' ? Crown : Award;
    case 'level_up':
      return Crown;
    case 'points':
      return Trophy;
    case 'streak':
      return Flame;
    case 'milestone':
      return Star;
    default:
      return Gift;
  }
}

function getNotificationColors(type: NotificationData['type'], rarity?: AchievementRarity) {
  if (type === 'achievement' && rarity) {
    return RARITY_CONFIG[rarity];
  }
  
  switch (type) {
    case 'level_up':
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
    case 'points':
      return { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' };
    case 'streak':
      return { color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' };
    case 'milestone':
      return { color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' };
    default:
      return { color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' };
  }
}

interface NotificationToastContentProps {
  data: NotificationData;
  onDismiss?: () => void;
}

function NotificationToastContent({ data, onDismiss }: NotificationToastContentProps) {
  const Icon = getNotificationIcon(data.type, data.achievement?.rarity);
  const colors = getNotificationColors(data.type, data.achievement?.rarity);
  
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border-l-4 bg-card shadow-lg min-w-[320px] max-w-[400px]',
      colors.borderColor
    )}>
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full',
        colors.bgColor
      )}>
        <Icon className={cn('h-5 w-5', colors.color)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight">
            {data.title}
          </h4>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {data.description}
        </p>
        
        {/* Achievement Details */}
        {data.achievement && (
          <div className="mt-2 space-y-1">
            <Badge 
              variant="secondary" 
              className={cn('text-xs', colors.bgColor, colors.color)}
            >
              {RARITY_CONFIG[data.achievement.rarity].label}
            </Badge>
            
            {data.achievement.points > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Trophy className="h-3 w-3" />
                +{data.achievement.points} pontos
              </div>
            )}
          </div>
        )}
        
        {/* Level Up Details */}
        {data.type === 'level_up' && data.level && (
          <div className="mt-2">
            <Badge variant="secondary" className={cn('text-xs', colors.bgColor, colors.color)}>
              Nível {data.level}
            </Badge>
          </div>
        )}
        
        {/* Points Details */}
        {data.type === 'points' && data.points && (
          <div className="mt-2">
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp className="h-3 w-3" />
              +{data.points.toLocaleString()} pontos
            </div>
          </div>
        )}
        
        {/* Streak Details */}
        {data.type === 'streak' && data.streak && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn('text-xs', colors.bgColor, colors.color)}>
                {data.streak.current} dias
              </Badge>
              
              {data.streak.milestone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3" />
                  Marco de {data.streak.milestone} dias!
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Action Button */}
        {data.actionLabel && data.onAction && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-7 text-xs"
            onClick={data.onAction}
          >
            {data.actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// Toast notification functions
export const showAchievementNotification = (achievement: NotificationData['achievement']) => {
  if (!achievement) return;
  
  const data: NotificationData = {
    type: 'achievement',
    title: 'Conquista Desbloqueada! 🎉',
    description: `Você desbloqueou "${achievement.name}"`,
    achievement,
    actionLabel: 'Ver Conquistas',
    onAction: () => {
      // Navigate to achievements page
      console.log('Navigate to achievements');
    }
  };
  
  toast.custom(
    (t) => (
      <NotificationToastContent 
        data={data} 
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 6000,
      position: 'top-right'
    }
  );
};

export const showLevelUpNotification = (level: number, points?: number) => {
  const data: NotificationData = {
    type: 'level_up',
    title: 'Parabéns! Você subiu de nível! 🎊',
    description: `Você alcançou o nível ${level}!`,
    level,
    points,
    actionLabel: 'Ver Perfil',
    onAction: () => {
      // Navigate to profile page
      console.log('Navigate to profile');
    }
  };
  
  toast.custom(
    (t) => (
      <NotificationToastContent 
        data={data} 
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 8000,
      position: 'top-right'
    }
  );
};

export const showPointsNotification = (points: number, reason: string) => {
  const data: NotificationData = {
    type: 'points',
    title: 'Pontos Ganhos! ⭐',
    description: reason,
    points,
    actionLabel: 'Ver Ranking',
    onAction: () => {
      // Navigate to leaderboard
      console.log('Navigate to leaderboard');
    }
  };
  
  toast.custom(
    (t) => (
      <NotificationToastContent 
        data={data} 
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 4000,
      position: 'top-right'
    }
  );
};

export const showStreakNotification = (current: number, milestone?: number) => {
  const data: NotificationData = {
    type: 'streak',
    title: milestone ? 'Marco de Sequência Atingido! 🔥' : 'Sequência Mantida! 🔥',
    description: milestone 
      ? `Incrível! Você manteve sua sequência por ${milestone} dias consecutivos!`
      : `Você está em uma sequência de ${current} dias!`,
    streak: { current, milestone },
    actionLabel: 'Ver Progresso',
    onAction: () => {
      // Navigate to progress page
      console.log('Navigate to progress');
    }
  };
  
  toast.custom(
    (t) => (
      <NotificationToastContent 
        data={data} 
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 5000,
      position: 'top-right'
    }
  );
};

export const showMilestoneNotification = (title: string, description: string) => {
  const data: NotificationData = {
    type: 'milestone',
    title,
    description,
    actionLabel: 'Ver Detalhes',
    onAction: () => {
      // Navigate to details page
      console.log('Navigate to details');
    }
  };
  
  toast.custom(
    (t) => (
      <NotificationToastContent 
        data={data} 
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 6000,
      position: 'top-right'
    }
  );
};

// Hook for managing gamification notifications
export function useGamificationNotifications() {
  const showAchievement = React.useCallback(showAchievementNotification, []);
  const showLevelUp = React.useCallback(showLevelUpNotification, []);
  const showPoints = React.useCallback(showPointsNotification, []);
  const showStreak = React.useCallback(showStreakNotification, []);
  const showMilestone = React.useCallback(showMilestoneNotification, []);
  
  return {
    showAchievement,
    showLevelUp,
    showPoints,
    showStreak,
    showMilestone
  };
}

export { NotificationToastContent };
export default NotificationToastContent;