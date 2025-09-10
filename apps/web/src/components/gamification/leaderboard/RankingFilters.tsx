'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users,
  Calendar,
  TrendingUp,
  Star,
  Flame,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardCategory, LeaderboardPeriod } from '@/types/gamification';

interface RankingFiltersProps {
  selectedCategory: LeaderboardCategory;
  selectedPeriod: LeaderboardPeriod;
  searchQuery?: string;
  minLevel?: number;
  maxLevel?: number;
  showOnlyFriends?: boolean;
  onCategoryChange: (category: LeaderboardCategory) => void;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  onSearchChange?: (query: string) => void;
  onLevelRangeChange?: (min?: number, max?: number) => void;
  onFriendsToggle?: (showFriends: boolean) => void;
  onReset?: () => void;
  compact?: boolean;
  className?: string;
}

const CATEGORY_CONFIG = {
  general: {
    label: 'Geral',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    description: 'Ranking geral por pontos totais'
  },
  learning: {
    label: 'Aprendizado',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Pontos de atividades de aprendizado'
  },
  engagement: {
    label: 'Engajamento',
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Pontos de participação e atividade'
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Pontos de interações sociais'
  }
};

const PERIOD_CONFIG = {
  daily: { 
    label: 'Hoje', 
    icon: Calendar,
    description: 'Ranking do dia atual'
  },
  weekly: { 
    label: 'Esta Semana', 
    icon: Calendar,
    description: 'Ranking dos últimos 7 dias'
  },
  monthly: { 
    label: 'Este Mês', 
    icon: Calendar,
    description: 'Ranking dos últimos 30 dias'
  },
  all: { 
    label: 'Todos os Tempos', 
    icon: TrendingUp,
    description: 'Ranking histórico completo'
  }
};

export function RankingFilters({
  selectedCategory,
  selectedPeriod,
  searchQuery = '',
  minLevel,
  maxLevel,
  showOnlyFriends = false,
  onCategoryChange,
  onPeriodChange,
  onSearchChange,
  onLevelRangeChange,
  onFriendsToggle,
  onReset,
  compact = false,
  className
}: RankingFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [localMinLevel, setLocalMinLevel] = useState(minLevel?.toString() || '');
  const [localMaxLevel, setLocalMaxLevel] = useState(maxLevel?.toString() || '');
  
  const hasActiveFilters = searchQuery || minLevel || maxLevel || showOnlyFriends;
  
  const handleLevelRangeApply = () => {
    const min = localMinLevel ? parseInt(localMinLevel) : undefined;
    const max = localMaxLevel ? parseInt(localMaxLevel) : undefined;
    onLevelRangeChange?.(min, max);
  };
  
  const handleReset = () => {
    setLocalMinLevel('');
    setLocalMaxLevel('');
    onReset?.();
  };
  
  if (compact && !isExpanded) {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {/* Quick Category Filters */}
        <div className="flex items-center gap-1">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(category as LeaderboardCategory)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            );
          })}
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Quick Period Filters */}
        <div className="flex items-center gap-1">
          {Object.entries(PERIOD_CONFIG).map(([period, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPeriodChange(period as LeaderboardPeriod)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            );
          })}
        </div>
        
        {/* Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1"
        >
          <Filter className="h-4 w-4" />
          Mais Filtros
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filtros ativos
          </Badge>
        )}
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Ranking
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Categoria</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
              const Icon = config.icon;
              const isSelected = selectedCategory === category;
              
              return (
                <Button
                  key={category}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'flex flex-col items-center gap-2 h-auto p-3',
                    isSelected && config.bgColor
                  )}
                  onClick={() => onCategoryChange(category as LeaderboardCategory)}
                >
                  <Icon className={cn('h-5 w-5', config.color)} />
                  <div className="text-center">
                    <div className="font-medium text-xs">{config.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {config.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
        
        <Separator />
        
        {/* Period Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Período</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(PERIOD_CONFIG).map(([period, config]) => {
              const Icon = config.icon;
              const isSelected = selectedPeriod === period;
              
              return (
                <Button
                  key={period}
                  variant={isSelected ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto p-3"
                  onClick={() => onPeriodChange(period as LeaderboardPeriod)}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-center">
                    <div className="font-medium text-xs">{config.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {config.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
        
        <Separator />
        
        {/* Advanced Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          {onSearchChange && (
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Buscar Usuário
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do usuário..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          
          {/* Level Range */}
          {onLevelRangeChange && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Faixa de Nível</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min"
                  type="number"
                  min="1"
                  value={localMinLevel}
                  onChange={(e) => setLocalMinLevel(e.target.value)}
                  className="w-20"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  placeholder="Max"
                  type="number"
                  min="1"
                  value={localMaxLevel}
                  onChange={(e) => setLocalMaxLevel(e.target.value)}
                  className="w-20"
                />
                <Button size="sm" onClick={handleLevelRangeApply}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Friends Filter */}
        {onFriendsToggle && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Mostrar apenas amigos</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Filtrar apenas usuários da sua lista de amigos
              </p>
            </div>
            <Button
              variant={showOnlyFriends ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFriendsToggle(!showOnlyFriends)}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {showOnlyFriends ? 'Ativo' : 'Inativo'}
            </Button>
          </div>
        )}
        
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
              
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  &quot;{searchQuery}&quot;
                </Badge>
              )}
              
              {(minLevel || maxLevel) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Nível {minLevel || '1'}-{maxLevel || '∞'}
                </Badge>
              )}
              
              {showOnlyFriends && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Apenas amigos
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RankingFilters;