'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  Search, 
  Filter, 
  Trophy, 
  Star, 
  Crown, 
  Medal,
  Lock,
  CheckCircle,
  Target
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { AchievementBadge } from '@/components/gamification/achievements/AchievementBadge';
import { AchievementRarity, Achievement, UserAchievement } from '@/types/gamification';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG = {
  LEARNING: { label: 'Aprendizado', icon: Star, color: 'text-blue-600' },
  ENGAGEMENT: { label: 'Engajamento', icon: Trophy, color: 'text-green-600' },
  SOCIAL: { label: 'Social', icon: Award, color: 'text-purple-600' },
  MILESTONE: { label: 'Marcos', icon: Crown, color: 'text-yellow-600' },
  SPECIAL: { label: 'Especiais', icon: Medal, color: 'text-red-600' }
};

const RARITY_CONFIG: Record<AchievementRarity, { label: string; color: string }> = {
  common: { label: 'Comum', color: 'text-gray-600' },
  rare: { label: 'Raro', color: 'text-blue-600' },
  epic: { label: 'Épico', color: 'text-purple-600' },
  legendary: { label: 'Lendário', color: 'text-yellow-600' },
  mythic: { label: 'Mítico', color: 'text-pink-600' }
};

export default function AchievementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'ALL'>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState('all');
  
  const { 
    achievements, 
    userStats,
    userAchievements,
    isLoadingAchievements,
    fetchAchievements 
  } = useGamificationStore();

  React.useEffect(() => {
    fetchAchievements({
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      rarity: selectedRarity !== 'ALL' ? selectedRarity : undefined,
      unlocked: activeTab === 'unlocked' ? true : activeTab === 'locked' ? false : undefined
    });
  }, [selectedCategory, selectedRarity, activeTab, fetchAchievements]);

  const withUserAchievement = (list: Achievement[]): (Achievement & { userAchievement?: UserAchievement })[] => {
    if (!userAchievements) return list;
    const map = new Map(userAchievements.map(ua => [ua.achievementId, ua]));
    return list.map(a => ({ ...a, userAchievement: map.get(a.id) }));
  };

  const filteredAchievements: Achievement[] = (achievements || []).filter(achievement => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        achievement.name.toLowerCase().includes(searchLower) ||
        achievement.description.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const unlockedSet = new Set((userAchievements || []).map(ua => ua.achievementId));
  const unlockedAchievements = filteredAchievements.filter(a => unlockedSet.has(a.id));
  const lockedAchievements = filteredAchievements.filter(a => !unlockedSet.has(a.id));
  // Sem dados de progresso detalhado no estado, deixamos a aba de "Em Progresso" vazia por enquanto
  const inProgressAchievements: Achievement[] = [];

  const achievementStats = {
    total: achievements?.length || 0,
    unlocked: unlockedAchievements.length,
    inProgress: inProgressAchievements.length,
    locked: lockedAchievements.length
  };

  if (isLoadingAchievements) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conquistas</h1>
            <p className="text-muted-foreground">
              Explore todas as conquistas disponíveis
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conquistas</h1>
          <p className="text-muted-foreground">
            Explore todas as conquistas disponíveis e acompanhe seu progresso
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{achievementStats.unlocked}</p>
            <p className="text-sm text-muted-foreground">Desbloqueadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{achievementStats.inProgress}</p>
            <p className="text-sm text-muted-foreground">Em Progresso</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{achievementStats.locked}</p>
            <p className="text-sm text-muted-foreground">Bloqueadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{achievementStats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Progress Overview */}
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Conquistas Desbloqueadas</span>
                  <span>{achievementStats.unlocked}/{achievementStats.total}</span>
                </div>
                <Progress 
                  value={achievementStats.total ? (achievementStats.unlocked / achievementStats.total) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {Object.entries(RARITY_CONFIG).map(([rarityKey, config]) => {
                  const count = unlockedAchievements.filter(
                    a => a.rarity === (rarityKey as AchievementRarity)
                  ).length;
                  
                  return (
                    <div key={rarityKey}>
                      <p className={cn('text-lg font-bold', config.color)}>{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conquistas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as string | 'ALL')}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="ALL">Todas as Categorias</option>
                {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
                  <option key={category} value={category}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Rarity Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value as AchievementRarity | 'ALL')}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="ALL">Todas as Raridades</option>
                {Object.entries(RARITY_CONFIG).map(([rarity, config]) => (
                  <option key={rarity} value={rarity}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Achievements Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas ({achievementStats.total})</TabsTrigger>
          <TabsTrigger value="unlocked">Desbloqueadas ({achievementStats.unlocked})</TabsTrigger>
          <TabsTrigger value="progress">Em Progresso ({achievementStats.inProgress})</TabsTrigger>
          <TabsTrigger value="locked">Bloqueadas ({achievementStats.locked})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <AchievementGrid achievements={withUserAchievement(filteredAchievements)} />
        </TabsContent>
        
        <TabsContent value="unlocked" className="mt-6">
          <AchievementGrid achievements={withUserAchievement(unlockedAchievements)} />
        </TabsContent>
        
        <TabsContent value="progress" className="mt-6">
          <AchievementGrid achievements={withUserAchievement(inProgressAchievements)} />
        </TabsContent>
        
        <TabsContent value="locked" className="mt-6">
          <AchievementGrid achievements={withUserAchievement(lockedAchievements)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AchievementGrid({ achievements }: { achievements: (Achievement & { userAchievement?: UserAchievement })[] }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-muted-foreground mb-2">
          Nenhuma conquista encontrada
        </p>
        <p className="text-sm text-muted-foreground">
          Tente ajustar os filtros ou continue progredindo para desbloquear mais conquistas!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          showProgress
          className="h-full"
        />
      ))}
    </div>
  );
}