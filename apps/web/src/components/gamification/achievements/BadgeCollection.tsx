'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Star, 
  Crown, 
  Award, 
  Search, 
  Filter,
  Grid3X3,
  List,
  Calendar,
  Target,
  Zap,
  Users,
  BookOpen,
  Flame,
  Gift
} from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { useGamificationStore } from '@/stores/gamificationStore';
import { AchievementRarity } from '@/types/gamification';
import { cn } from '@/lib/utils';

interface BadgeCollectionProps {
  className?: string;
  viewMode?: 'grid' | 'list';
  showFilters?: boolean;
  compact?: boolean;
}

type FilterType = 'all' | 'unlocked' | 'locked' | 'recent';
type SortType = 'name' | 'rarity' | 'date' | 'points';

const RARITY_ORDER: Record<AchievementRarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  LEARNING: BookOpen,
  SOCIAL: Users,
  STREAK: Flame,
  MILESTONE: Target,
  SPECIAL: Gift,
  SEASONAL: Calendar
};

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'LEARNING':
      return 'Aprendizado';
    case 'SOCIAL':
      return 'Social';
    case 'STREAK':
      return 'Sequências';
    case 'MILESTONE':
      return 'Marcos';
    case 'SPECIAL':
      return 'Especiais';
    case 'SEASONAL':
      return 'Sazonais';
    default:
      return category;
  }
}

function getRarityLabel(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'COMMON':
      return 'Comum';
    case 'UNCOMMON':
      return 'Incomum';
    case 'RARE':
      return 'Raro';
    case 'EPIC':
      return 'Épico';
    case 'LEGENDARY':
      return 'Lendário';
    default:
      return rarity;
  }
}

export function BadgeCollection({ 
  className, 
  viewMode: initialViewMode = 'grid',
  showFilters = true,
  compact = false 
}: BadgeCollectionProps) {
  const { 
    achievements, 
    userAchievements, 
    isLoadingAchievements 
  } = useGamificationStore();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortType>('rarity');

  const filteredAndSortedAchievements = useMemo(() => {
    if (!achievements) return [];

    let filtered = achievements.filter(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
      const isUnlocked = !!userAchievement;
      const categoryName = achievement.category?.name || '';
      
      // Search filter
      if (searchTerm && !achievement.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !achievement.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      switch (filterType) {
        case 'unlocked':
          if (!isUnlocked) return false;
          break;
        case 'locked':
          if (isUnlocked) return false;
          break;
        case 'recent':
          if (!userAchievement || !userAchievement.unlockedAt) return false;
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (new Date(userAchievement.unlockedAt) < weekAgo) return false;
          break;
      }
      
      // Category filter
      if (selectedCategory !== 'all' && categoryName !== selectedCategory) {
        return false;
      }
      
      // Rarity filter
      if (selectedRarity !== 'all' && achievement.rarity !== selectedRarity) {
        return false;
      }
      
      return true;
    });

    // Sort achievements
    filtered.sort((a, b) => {
      const userAchievementA = userAchievements.find(ua => ua.achievementId === a.id);
      const userAchievementB = userAchievements.find(ua => ua.achievementId === b.id);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rarity':
          return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        case 'date':
          if (!userAchievementA && !userAchievementB) return 0;
          if (!userAchievementA) return 1;
          if (!userAchievementB) return -1;
          return new Date(userAchievementB.unlockedAt!).getTime() - new Date(userAchievementA.unlockedAt!).getTime();
        case 'points':
          return b.points - a.points;
        default:
          return 0;
      }
    });

    return filtered;
  }, [achievements, userAchievements, searchTerm, filterType, selectedCategory, selectedRarity, sortBy]);

  const stats = useMemo(() => {
    if (!achievements) return { total: 0, unlocked: 0, percentage: 0 };
    
    const total = achievements.length;
    const unlocked = userAchievements.length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    
    return { total, unlocked, percentage };
  }, [achievements, userAchievements]);

  const categoryStats = useMemo(() => {
    if (!achievements) return {} as Record<string, { total: number; unlocked: number }>;
    
    const stats: Record<string, { total: number; unlocked: number }> = {};
    
    achievements.forEach(achievement => {
      const key = achievement.category?.name || 'Sem Categoria';
      if (!stats[key]) stats[key] = { total: 0, unlocked: 0 };
      stats[key].total++;
      if (userAchievements.some(ua => ua.achievementId === achievement.id)) {
        stats[key].unlocked++;
      }
    });
    
    return stats;
  }, [achievements, userAchievements]);

  if (isLoadingAchievements) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Coleção de Badges
            </span>
            <Badge variant="secondary">
              {stats.unlocked}/{stats.total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {filteredAndSortedAchievements.slice(0, 12).map(achievement => {
              const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
              return (
                <AchievementBadge
                  key={achievement.id}
                  achievement={{ ...achievement, userAchievement }}
                  size="sm"
                  className="h-16 w-16"
                />
              );
            })}
          </div>
          {filteredAndSortedAchievements.length > 12 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                Ver todos ({filteredAndSortedAchievements.length - 12} mais)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Coleção de Badges
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              {stats.unlocked}/{stats.total} ({stats.percentage}%)
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Overview */}
        <Tabs value="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar badges..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unlocked">Desbloqueados</SelectItem>
                    <SelectItem value="locked">Bloqueados</SelectItem>
                    <SelectItem value="recent">Recentes</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedRarity} onValueChange={(value) => setSelectedRarity(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Raridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="COMMON">Comum</SelectItem>
                    <SelectItem value="UNCOMMON">Incomum</SelectItem>
                    <SelectItem value="RARE">Raro</SelectItem>
                    <SelectItem value="EPIC">Épico</SelectItem>
                    <SelectItem value="LEGENDARY">Lendário</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rarity">Raridade</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="points">Pontos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Achievement Grid/List */}
            <ScrollArea className="h-96">
              {filteredAndSortedAchievements.length > 0 ? (
                <div className={cn(
                  viewMode === 'grid' 
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-2'
                )}>
                  {filteredAndSortedAchievements.map(achievement => {
                    const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
                    return (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={{ ...achievement, userAchievement }}
                        size={viewMode === 'grid' ? 'md' : 'sm'}
                        className={viewMode === 'list' ? 'flex-row' : ''}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum badge encontrado com os filtros aplicados
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryStats).map(([category, stats]) => {
                const IconComponent = CATEGORY_ICONS[category as string] || Trophy;
                const percentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;
                
                return (
                  <Card key={category} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedCategory(category)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <span className="font-medium">
                            {getCategoryLabel(category)}
                          </span>
                        </div>
                        <Badge variant="outline">
                          {stats.unlocked}/{stats.total}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default BadgeCollection;