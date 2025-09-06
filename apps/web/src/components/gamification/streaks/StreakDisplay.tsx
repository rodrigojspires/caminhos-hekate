'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  Target
} from 'lucide-react';
import { UserStreak } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StreakDisplayProps {
  streak?: UserStreak | null;
  className?: string;
  showDetails?: boolean;
}

const STREAK_MILESTONES = [
  { days: 3, title: 'Iniciante Consistente', points: 10, color: 'text-green-600' },
  { days: 7, title: 'Uma Semana Forte', points: 25, color: 'text-blue-600' },
  { days: 14, title: 'Duas Semanas Dedicado', points: 50, color: 'text-purple-600' },
  { days: 30, title: 'Um Mês Disciplinado', points: 100, color: 'text-orange-600' },
  { days: 60, title: 'Dois Meses Imparável', points: 200, color: 'text-red-600' },
  { days: 100, title: 'Cem Dias Lendário', points: 500, color: 'text-yellow-600' }
];

export function StreakDisplay({ streak, className, showDetails = true }: StreakDisplayProps) {
  if (!streak) {
    return (
      <Card className={cn('bg-gray-50 border-gray-200', className)}>
        <CardContent className="p-6 text-center">
          <Flame className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">Nenhuma Sequência Ativa</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comece sua jornada de aprendizado para iniciar uma sequência!
          </p>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            0 dias consecutivos
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak.currentStreak || 0;
  const longestStreak = streak.longestStreak || 0;
  const lastActivityAt = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  // Derive activity status: active if last activity within 48h
  const isActive = lastActivityAt ? differenceInHours(new Date(), lastActivityAt) < 48 : false;
  
  // Calculate time until streak expires (48 hours from last activity)
  const hoursUntilExpiry = lastActivityAt 
    ? Math.max(0, 48 - differenceInHours(new Date(), lastActivityAt))
    : 0;
  
  const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry <= 12;
  const hasExpired = hoursUntilExpiry === 0 && !isActive;

  // Find current and next milestones
  const currentMilestone = STREAK_MILESTONES
    .filter(m => currentStreak >= m.days)
    .pop();
  
  const nextMilestone = STREAK_MILESTONES
    .find(m => currentStreak < m.days);

  const getStreakColor = () => {
    if (hasExpired) return 'text-gray-500';
    if (isExpiringSoon) return 'text-orange-500';
    if (currentStreak >= 100) return 'text-yellow-500';
    if (currentStreak >= 30) return 'text-red-500';
    if (currentStreak >= 14) return 'text-purple-500';
    if (currentStreak >= 7) return 'text-blue-500';
    if (currentStreak >= 3) return 'text-green-500';
    return 'text-orange-500';
  };

  const getStreakBgColor = () => {
    if (hasExpired) return 'bg-gray-50 border-gray-200';
    if (isExpiringSoon) return 'bg-orange-50 border-orange-200';
    if (currentStreak >= 100) return 'bg-yellow-50 border-yellow-200';
    if (currentStreak >= 30) return 'bg-red-50 border-red-200';
    if (currentStreak >= 14) return 'bg-purple-50 border-purple-200';
    if (currentStreak >= 7) return 'bg-blue-50 border-blue-200';
    if (currentStreak >= 3) return 'bg-green-50 border-green-200';
    return 'bg-orange-50 border-orange-200';
  };

  return (
    <Card className={cn(getStreakBgColor(), className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-3 rounded-full',
              hasExpired ? 'bg-gray-100' : 'bg-white/50'
            )}>
              <Flame className={cn('h-6 w-6', getStreakColor())} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasExpired ? 'Sequência expirada' : 'Sequência atual'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            {isExpiringSoon && (
              <Badge variant="destructive" className="mb-1">
                <Clock className="h-3 w-3 mr-1" />
                {hoursUntilExpiry}h restantes
              </Badge>
            )}
            {currentMilestone && (
              <Badge className={cn('text-xs', currentMilestone.color)}>
                {currentMilestone.title}
              </Badge>
            )}
          </div>
        </div>

        {showDetails && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">{longestStreak}</p>
                <p className="text-xs text-muted-foreground">Maior sequência</p>
              </div>
              
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">
                  {lastActivityAt ? formatDistanceToNow(lastActivityAt, {
                    addSuffix: true,
                    locale: ptBR
                  }) : 'Nunca'}
                </p>
                <p className="text-xs text-muted-foreground">Última atividade</p>
              </div>
            </div>

            {/* Next Milestone Progress */}
            {nextMilestone && !hasExpired && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Próxima meta</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{nextMilestone.points} pontos
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{nextMilestone.title}</span>
                    <span>{currentStreak} / {nextMilestone.days} dias</span>
                  </div>
                  <Progress 
                    value={(currentStreak / nextMilestone.days) * 100} 
                    className="h-2" 
                  />
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Faltam {nextMilestone.days - currentStreak} dias para a próxima recompensa
                </p>
              </div>
            )}

            {/* Motivation Message */}
            <div className="mt-4 p-3 bg-white/30 rounded-lg text-center">
              {hasExpired ? (
                <p className="text-sm text-muted-foreground">
                  Sua sequência expirou. Que tal começar uma nova hoje?
                </p>
              ) : isExpiringSoon ? (
                <p className="text-sm text-orange-700">
                  ⚠️ Sua sequência expira em {hoursUntilExpiry} horas! Faça uma atividade para mantê-la.
                </p>
              ) : currentStreak === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Comece sua primeira sequência fazendo uma atividade hoje!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  🔥 Você está indo muito bem! Continue assim para manter sua sequência.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default StreakDisplay;
