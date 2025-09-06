'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  TrendingUp,
  Users,
  Calendar,
  Flame
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LeaderboardCategory, LeaderboardPeriod } from '@/types/gamification';
import { cn } from '@/lib/utils';

interface LeaderboardPreviewProps {
  maxEntries?: number;
  showFilters?: boolean;
  className?: string;
}

const CATEGORY_CONFIG = {
  general: {
    label: 'Geral',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  learning: {
    label: 'Aprendizado',
    icon: Award,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  engagement: {
    label: 'Engajamento',
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  }
};

const PERIOD_CONFIG = {
  daily: { label: 'Hoje', icon: Calendar },
  weekly: { label: 'Semana', icon: Calendar },
  monthly: { label: 'Mês', icon: Calendar },
  all: { label: 'Todos os tempos', icon: TrendingUp }
};

function getRankIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {position}
        </div>
      );
  }
}

function getRankBadgeColor(position: number) {
  switch (position) {
    case 1:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 2:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 3:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function LeaderboardPreview({ 
  maxEntries = 5, 
  showFilters = true,
  className 
}: LeaderboardPreviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('general');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('weekly');
  
  const { 
    leaderboard, 
    leaderboardPosition,
    isLoadingLeaderboard,
    fetchLeaderboard 
  } = useGamificationStore();

  React.useEffect(() => {
    fetchLeaderboard(selectedPeriod, selectedCategory);
  }, [selectedCategory, selectedPeriod, fetchLeaderboard]);

  const categoryConfig = CATEGORY_CONFIG[selectedCategory];
  const CategoryIcon = categoryConfig.icon;

  if (isLoadingLeaderboard) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(maxEntries)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topEntries = leaderboard?.slice(0, maxEntries) || [];
  const currentUserPosition = leaderboardPosition?.[selectedCategory] || null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking - {categoryConfig.label}
          </CardTitle>
          
          {currentUserPosition && (
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Sua posição: #{currentUserPosition}
            </Badge>
          )}
        </div>
        
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Category Filters */}
            <div className="flex items-center gap-1">
              {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category as LeaderboardCategory)}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
            
            {/* Period Filters */}
            <div className="flex items-center gap-1">
              {Object.entries(PERIOD_CONFIG).map(([period, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period as LeaderboardPeriod)}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {topEntries.length > 0 ? (
          <div className="space-y-2">
            {topEntries.map((entry, index) => {
              const position = index + 1;
              const isCurrentUser = entry.userId === 'current-user'; // This should come from auth context
              
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isCurrentUser ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-accent/50',
                    position <= 3 ? categoryConfig.bgColor : ''
                  )}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(position)}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.userAvatar || ''} />
                    <AvatarFallback className="text-xs">
                      {entry.userName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'font-medium truncate',
                        isCurrentUser ? 'text-primary' : 'text-foreground'
                      )}>
                        {entry.userName || 'Usuário'}
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground ml-1">(Você)</span>
                        )}
                      </p>
                      
                      {position <= 3 && (
                        <Badge 
                          variant="secondary" 
                          className={cn('text-xs', getRankBadgeColor(position))}
                        >
                          #{position}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryIcon className={cn('h-3 w-3', categoryConfig.color)} />
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory === 'general' && `${entry.points?.toLocaleString('pt-BR') || 0} pontos`}
                        {selectedCategory === 'learning' && `${entry.points?.toLocaleString('pt-BR') || 0} pontos de aprendizado`}
                        {selectedCategory === 'engagement' && `${entry.points?.toLocaleString('pt-BR') || 0} pontos de engajamento`}
                        {selectedCategory === 'social' && `${entry.points?.toLocaleString('pt-BR') || 0} pontos sociais`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      position === 1 ? 'text-yellow-600' :
                      position === 2 ? 'text-gray-600' :
                      position === 3 ? 'text-amber-600' :
                      'text-muted-foreground'
                    )}>
                      {entry.points?.toLocaleString('pt-BR') || 0}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhum dado de ranking disponível</p>
            <p className="text-sm text-muted-foreground">
              Seja o primeiro a aparecer no ranking!
            </p>
          </div>
        )}
        
        {/* View Full Leaderboard Button */}
        {topEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full" size="sm">
              Ver Ranking Completo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LeaderboardPreview;