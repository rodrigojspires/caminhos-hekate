'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Flame, 
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { UserStreak } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StreakCounterProps {
  streak?: UserStreak | null;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showLastActivity?: boolean;
}

const STREAK_COLORS = {
  expired: 'text-gray-500',
  expiring: 'text-orange-500',
  legendary: 'text-yellow-500', // 100+ days
  master: 'text-red-500',       // 30+ days
  expert: 'text-purple-500',    // 14+ days
  intermediate: 'text-blue-500', // 7+ days
  beginner: 'text-green-500',   // 3+ days
  starter: 'text-orange-500'    // 1-2 days
};

const STREAK_BG_COLORS = {
  expired: 'bg-gray-50 border-gray-200',
  expiring: 'bg-orange-50 border-orange-200',
  legendary: 'bg-yellow-50 border-yellow-200',
  master: 'bg-red-50 border-red-200',
  expert: 'bg-purple-50 border-purple-200',
  intermediate: 'bg-blue-50 border-blue-200',
  beginner: 'bg-green-50 border-green-200',
  starter: 'bg-orange-50 border-orange-200'
};

export function StreakCounter({ 
  streak, 
  className, 
  variant = 'default',
  showLastActivity = true 
}: StreakCounterProps) {
  if (!streak) {
    return (
      <Card className={cn('bg-gray-50 border-gray-200', className)}>
        <CardContent className={cn(
          'flex items-center gap-3',
          variant === 'compact' ? 'p-3' : 'p-4'
        )}>
          <div className="p-2 rounded-full bg-gray-100">
            <Flame className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Nenhuma sequência</p>
            <p className="text-xs text-gray-500">Comece hoje!</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            0 dias
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak.currentStreak || 0;
  const longestStreak = streak.longestStreak || 0;
  const lastActivityAt = streak.lastActivity ? new Date(streak.lastActivity) : null;
  
  // Calculate streak status
  const hoursUntilExpiry = lastActivityAt 
    ? Math.max(0, 48 - differenceInHours(new Date(), lastActivityAt))
    : 0;
  
  const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry <= 12;
  const hasExpired = hoursUntilExpiry === 0 && currentStreak > 0;

  const getStreakLevel = () => {
    if (hasExpired) return 'expired';
    if (isExpiringSoon) return 'expiring';
    if (currentStreak >= 100) return 'legendary';
    if (currentStreak >= 30) return 'master';
    if (currentStreak >= 14) return 'expert';
    if (currentStreak >= 7) return 'intermediate';
    if (currentStreak >= 3) return 'beginner';
    return 'starter';
  };

  const streakLevel = getStreakLevel();
  const streakColor = STREAK_COLORS[streakLevel];
  const streakBgColor = STREAK_BG_COLORS[streakLevel];

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Flame className={cn('h-4 w-4', streakColor)} />
        <span className="text-sm font-medium">
          {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
        </span>
        {isExpiringSoon && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            {hoursUntilExpiry}h
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(streakBgColor, className)}>
      <CardContent className={cn(
        'flex items-center gap-3',
        variant === 'compact' ? 'p-3' : 'p-4'
      )}>
        <div className={cn(
          'p-2 rounded-full',
          hasExpired ? 'bg-gray-100' : 'bg-white/50'
        )}>
          <Flame className={cn('h-5 w-5', streakColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
            </p>
            {isExpiringSoon && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                <Clock className="h-3 w-3 mr-1" />
                {hoursUntilExpiry}h
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {showLastActivity && lastActivityAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="truncate">
                  {formatDistanceToNow(lastActivityAt, {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            )}
            
            {longestStreak > currentStreak && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Máx: {longestStreak}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <Badge 
            variant={hasExpired ? "secondary" : "default"} 
            className="text-xs"
          >
            {hasExpired ? 'Expirada' : 'Ativa'}
          </Badge>
          
          {variant === 'default' && (
            <p className="text-xs text-muted-foreground mt-1">
              {hasExpired 
                ? 'Recomece hoje' 
                : isExpiringSoon 
                ? 'Expira em breve' 
                : 'Sequência ativa'
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StreakCounter;