'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  History, 
  Plus, 
  Minus,
  Calendar,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { PointTransaction } from '@/types/gamification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PointsDisplayProps {
  className?: string;
  showTransactions?: boolean;
  compact?: boolean;
}

function getTransactionIcon(transaction: PointTransaction) {
  switch (transaction.reason) {
    case 'ACHIEVEMENT_UNLOCK':
      return Award;
    case 'STREAK_ACHIEVEMENT':
      return Target;
    case 'DAILY_LOGIN':
      return Calendar;
    case 'COURSE_COMPLETION':
      return Zap;
    default:
      return transaction.points > 0 ? Plus : Minus;
  }
}

function getTransactionColor(transaction: PointTransaction) {
  if (transaction.points > 0) {
    return 'text-green-600';
  }
  return 'text-red-600';
}

function getReasonLabel(reason: string) {
  switch (reason) {
    case 'ACHIEVEMENT_UNLOCK':
      return 'Conquista desbloqueada';
    case 'STREAK_ACHIEVEMENT':
      return 'Marco de sequência';
    case 'DAILY_LOGIN':
      return 'Login diário';
    case 'COURSE_COMPLETION':
      return 'Curso concluído';
    case 'COMMENT_POSTED':
      return 'Comentário publicado';
    case 'VIDEO_WATCHED':
      return 'Vídeo assistido';
    case 'QUIZ_COMPLETED':
      return 'Quiz completado';
    case 'MANUAL_ADJUSTMENT':
      return 'Ajuste manual';
    default:
      return reason.replace(/_/g, ' ').toLowerCase();
  }
}

export function PointsDisplay({ 
  className, 
  showTransactions = true, 
  compact = false 
}: PointsDisplayProps) {
  const { 
    userPoints, 
    recentTransactions, 
    isLoadingPoints 
  } = useGamificationStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  if (isLoadingPoints) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </CardContent>
      </Card>
    );
  }

  if (!userPoints) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum dado de pontos disponível</p>
        </CardContent>
      </Card>
    );
  }

  const filteredTransactions = recentTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.createdAt);
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return transactionDate >= monthAgo;
      case 'all':
      default:
        return true;
    }
  });

  const earnedPoints = filteredTransactions
    .filter(t => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);
  
  const spentPoints = filteredTransactions
    .filter(t => t.points < 0)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Coins className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pontos Totais</p>
                <p className="text-2xl font-bold">{userPoints.totalPoints.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              Nível {userPoints.currentLevel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-600" />
          Sistema de Pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Total de Pontos</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {userPoints.totalPoints.toLocaleString()}
                </p>
              </div>
              <Coins className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Pontos Disponíveis</p>
                <p className="text-2xl font-bold text-green-900">
                  {userPoints.totalPoints.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Nível Atual</p>
                <p className="text-2xl font-bold text-purple-900">
                  {userPoints.currentLevel}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        {showTransactions && (
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Transações
              </h3>
              <TabsList className="grid w-48 grid-cols-3">
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="all">Tudo</TabsTrigger>
              </TabsList>
            </div>

            {/* Period Summary */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Pontos Ganhos</span>
                </div>
                <p className="text-xl font-bold text-green-900 mt-1">
                  +{earnedPoints.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Pontos Gastos</span>
                </div>
                <p className="text-xl font-bold text-red-900 mt-1">
                  -{spentPoints.toLocaleString()}
                </p>
              </div>
            </div>

            <TabsContent value={selectedPeriod} className="mt-4">
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => {
                      const IconComponent = getTransactionIcon(transaction);
                      const colorClass = getTransactionColor(transaction);
                      
                      return (
                        <div 
                          key={transaction.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'p-2 rounded-full',
                              transaction.points > 0 ? 'bg-green-100' : 'bg-red-100'
                            )}>
                              <IconComponent className={cn('h-4 w-4', colorClass)} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {getReasonLabel(transaction.reason)}
                              </p>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground">
                                  {transaction.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(transaction.createdAt), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn('font-bold', colorClass)}>
                              {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhuma transação encontrada para este período
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default PointsDisplay;