'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  Target,
  Trophy,
  Zap,
  Heart,
  Star,
  TrendingUp,
  Calendar,
  Clock,
  Gift,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserStreak } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { differenceInHours, format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StreakMotivationProps {
  streak?: UserStreak | null;
  className?: string;
  variant?: 'default' | 'compact' | 'card';
  showNextMilestone?: boolean;
  showTips?: boolean;
}

const STREAK_MILESTONES = [
  { days: 3, title: 'Iniciante Consistente', points: 10, icon: Star, color: 'text-green-600', bgColor: 'bg-green-50' },
  { days: 7, title: 'Uma Semana Forte', points: 25, icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { days: 14, title: 'Duas Semanas Dedicado', points: 50, icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { days: 30, title: 'Um Mês Disciplinado', points: 100, icon: Trophy, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { days: 60, title: 'Dois Meses Imparável', points: 200, icon: Flame, color: 'text-red-600', bgColor: 'bg-red-50' },
  { days: 100, title: 'Cem Dias Lendário', points: 500, icon: Sparkles, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
];

const MOTIVATIONAL_MESSAGES = {
  starting: [
    "🌱 Toda jornada épica começa com um único passo!",
    "✨ Hoje é o dia perfeito para começar sua sequência!",
    "🚀 Pequenos passos diários levam a grandes conquistas!"
  ],
  building: [
    "🔥 Você está construindo um hábito incrível!",
    "💪 Cada dia conta - continue assim!",
    "⭐ Sua consistência está impressionante!"
  ],
  strong: [
    "🏆 Você é um exemplo de dedicação!",
    "🎯 Sua disciplina está rendendo frutos!",
    "🌟 Continue brilhando com essa consistência!"
  ],
  legendary: [
    "👑 Você alcançou um nível lendário de consistência!",
    "🔥 Sua dedicação é verdadeiramente inspiradora!",
    "💎 Você é um diamante lapidado pela disciplina!"
  ],
  expiring: [
    "⏰ Sua sequência precisa de você hoje!",
    "🚨 Não deixe sua conquista escapar!",
    "💥 Uma ação hoje mantém sua sequência viva!"
  ],
  expired: [
    "🌅 Cada novo dia é uma nova oportunidade!",
    "💪 Recomeçar é um ato de coragem!",
    "🎯 Sua próxima sequência será ainda melhor!"
  ]
};

const STREAK_TIPS = [
  "📅 Defina um horário fixo para suas atividades",
  "🎯 Comece com metas pequenas e alcançáveis",
  "📱 Use lembretes para não esquecer",
  "🏆 Celebre cada marco conquistado",
  "👥 Compartilhe seus progressos com amigos",
  "📊 Acompanhe seu progresso visualmente",
  "🔄 Crie uma rotina que funcione para você",
  "💡 Prepare-se na noite anterior",
  "🎉 Recompense-se pelos marcos alcançados",
  "🧘 Seja gentil consigo mesmo nos dias difíceis"
];

export function StreakMotivation({ 
  streak, 
  className, 
  variant = 'default',
  showNextMilestone = true,
  showTips = true 
}: StreakMotivationProps) {
  const currentStreak = streak?.currentStreak || 0;
  const lastActivityAt = streak?.lastActivity ? new Date(streak.lastActivity) : null;
  
  // Calculate streak status
  const hoursUntilExpiry = lastActivityAt 
    ? Math.max(0, 48 - differenceInHours(new Date(), lastActivityAt))
    : 0;
  
  const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry <= 12;
  const hasExpired = hoursUntilExpiry === 0 && currentStreak > 0;
  
  const { motivationData, nextMilestone, randomTip } = useMemo(() => {
    // Determine motivation category
    let category: keyof typeof MOTIVATIONAL_MESSAGES;
    if (hasExpired) {
      category = 'expired';
    } else if (isExpiringSoon) {
      category = 'expiring';
    } else if (currentStreak === 0) {
      category = 'starting';
    } else if (currentStreak >= 30) {
      category = 'legendary';
    } else if (currentStreak >= 7) {
      category = 'strong';
    } else {
      category = 'building';
    }
    
    // Get random message from category
    const messages = MOTIVATIONAL_MESSAGES[category];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Find next milestone
    const nextMilestone = STREAK_MILESTONES.find(m => currentStreak < m.days);
    
    // Get random tip
    const randomTip = STREAK_TIPS[Math.floor(Math.random() * STREAK_TIPS.length)];
    
    return {
      motivationData: {
        category,
        message: randomMessage,
        color: category === 'expired' ? 'text-gray-600' : 
               category === 'expiring' ? 'text-orange-600' :
               category === 'legendary' ? 'text-yellow-600' :
               'text-blue-600'
      },
      nextMilestone,
      randomTip
    };
  }, [currentStreak, hasExpired, isExpiringSoon]);
  
  if (variant === 'compact') {
    return (
      <div className={cn('p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border', className)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-white/80">
            <Heart className="h-4 w-4 text-pink-500" />
          </div>
          <div className="flex-1">
            <p className={cn('text-sm font-medium', motivationData.color)}>
              {motivationData.message}
            </p>
            {nextMilestone && showNextMilestone && (
              <p className="text-xs text-gray-600 mt-1">
                Faltam {nextMilestone.days - currentStreak} dias para {nextMilestone.title}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          Motivação Diária
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Motivation Message */}
        <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border">
          <div className="mb-4">
            {motivationData.category === 'legendary' && <Sparkles className="h-8 w-8 text-yellow-500 mx-auto mb-2" />}
            {motivationData.category === 'strong' && <Trophy className="h-8 w-8 text-orange-500 mx-auto mb-2" />}
            {motivationData.category === 'building' && <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />}
            {motivationData.category === 'starting' && <Star className="h-8 w-8 text-green-500 mx-auto mb-2" />}
            {motivationData.category === 'expiring' && <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />}
            {motivationData.category === 'expired' && <Target className="h-8 w-8 text-gray-500 mx-auto mb-2" />}
          </div>
          
          <p className={cn('text-lg font-semibold mb-2', motivationData.color)}>
            {motivationData.message}
          </p>
          
          {isExpiringSoon && (
            <Badge variant="destructive" className="mt-2">
              <Clock className="h-3 w-3 mr-1" />
              Expira em {hoursUntilExpiry} horas
            </Badge>
          )}
        </div>
        
        {/* Next Milestone Progress */}
        {nextMilestone && showNextMilestone && !hasExpired && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <nextMilestone.icon className={cn('h-4 w-4', nextMilestone.color)} />
                <span className="font-medium text-sm">Próxima Meta</span>
              </div>
              <Badge variant="outline" className="text-xs">
                +{nextMilestone.points} pontos
              </Badge>
            </div>
            
            <div className={cn('p-4 rounded-lg border', nextMilestone.bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('font-medium text-sm', nextMilestone.color)}>
                  {nextMilestone.title}
                </span>
                <span className="text-xs text-gray-600">
                  {currentStreak} / {nextMilestone.days} dias
                </span>
              </div>
              
              <Progress 
                value={(currentStreak / nextMilestone.days) * 100} 
                className="h-2 mb-2" 
              />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  Faltam {nextMilestone.days - currentStreak} dias
                </span>
                <span className={nextMilestone.color}>
                  {format(addDays(new Date(), nextMilestone.days - currentStreak), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Daily Tip */}
        {showTips && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-100">
                <Gift className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 text-sm mb-1">
                  💡 Dica do Dia
                </h4>
                <p className="text-sm text-amber-700">
                  {randomTip}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <div className="text-center">
          <Button 
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            size="sm"
          >
            {hasExpired ? (
              <>Começar Nova Sequência <Star className="h-4 w-4 ml-2" /></>
            ) : isExpiringSoon ? (
              <>Manter Sequência <Flame className="h-4 w-4 ml-2" /></>
            ) : (
              <>Continuar Jornada <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default StreakMotivation;