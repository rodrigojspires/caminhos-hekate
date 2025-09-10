'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  Star,
  Flame,
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { LeaderboardCategory, LeaderboardPeriod } from '@/types/gamification';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LeaderboardEntry } from './LeaderboardEntry';

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

  useEffect(() => {
    // Corrige a assinatura: (period, category)
    fetchLeaderboard(selectedPeriod, selectedCategory);
  }, [selectedCategory, selectedPeriod, fetchLeaderboard]);

  const categoryConfig = CATEGORY_CONFIG[selectedCategory];

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
              <Skeleton key={i} className="h-16 w-full" />
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
              return (
                <LeaderboardEntry
                  key={entry.id}
                  entry={entry}
                  position={position}
                  category={selectedCategory}
                  compact
                />
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