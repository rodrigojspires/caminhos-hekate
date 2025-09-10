'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Trophy, 
  Plus, 
  Minus, 
  Star, 
  Flame, 
  BookOpen, 
  Award,
  Clock
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { PointTransaction, ActionType } from '@/types/gamification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityItemProps {
  transaction: PointTransaction;
}

function ActivityItem({ transaction }: ActivityItemProps) {
  const getActivityIcon = (actionType?: ActionType) => {
    switch (actionType) {
      case 'course_completed':
        return <BookOpen className="h-4 w-4" />;
      case 'achievement_unlocked':
        return <Trophy className="h-4 w-4" />;
      case 'daily_activity':
        return <Star className="h-4 w-4" />;
      case 'streak_milestone':
        return <Flame className="h-4 w-4" />;
      default:
        return <Plus className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (actionType?: ActionType, metadata?: any) => {
    switch (actionType) {
      case 'course_completed':
        return `Curso concluído: ${metadata?.courseName || 'Curso'}`;
      case 'achievement_unlocked':
        return `Conquista desbloqueada: ${metadata?.achievementName || 'Conquista'}`;
      case 'daily_activity':
        return 'Login diário realizado';
      case 'streak_milestone':
        return `Bônus de sequência: ${metadata?.streakDays || 0} dias`;
      default:
        return 'Atividade realizada';
    }
  };

  const getActivityColor = (actionType?: ActionType) => {
    switch (actionType) {
      case 'course_completed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'achievement_unlocked':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'daily_activity':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'streak_milestone':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isPositive = transaction.points > 0;
  const colorClass = getActivityColor(transaction.actionType);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className={`p-2 rounded-full border ${colorClass}`}>
        {getActivityIcon(transaction.actionType)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {getActivityDescription(transaction.actionType, transaction.metadata)}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge 
              variant={isPositive ? "default" : "destructive"}
              className="text-xs"
            >
              {isPositive ? '+' : ''}{transaction.points}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(transaction.createdAt), {
              addSuffix: true,
              locale: ptBR
            })}
          </p>
        </div>
        
        {transaction.metadata?.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {transaction.metadata?.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function RecentActivity() {
  const { recentTransactions, isLoadingPoints } = useGamificationStore();

  if (isLoadingPoints) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions && recentTransactions.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <ActivityItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhuma atividade recente</p>
            <p className="text-sm text-muted-foreground">
              Comece a usar a plataforma para ver suas atividades aqui!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivity;
