'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Flame, Award } from 'lucide-react';
import { useGamificationStore, useInitializeGamification } from '@/stores/gamificationStore';
import type { Achievement } from '@/types/gamification';
import { AchievementBadge } from '../achievements/AchievementBadge';
import { ProgressChart } from '../charts/ProgressChart';
import { StreakDisplay } from '../streaks/StreakDisplay';
import { LeaderboardPreview } from '../leaderboard/LeaderboardPreview';
import { RecentActivity } from './RecentActivity';
import { LevelProgress } from './LevelProgress';
import { GoalProgress } from './GoalProgress';

export function GamificationDashboard() {
  const {
    userStats,
    achievements,
    userStreak,
    leaderboardPosition,
    isLoadingStats,
    isLoadingAchievements,
    isLoadingStreak,
  } = useGamificationStore();
  const { initialize } = useInitializeGamification();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoadingStats || isLoadingAchievements || isLoadingStreak) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="temple-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Pontos Totais</p>
                <p className="text-2xl font-bold text-[hsl(var(--temple-text-primary))]">
                  {userStats?.totalPoints?.toLocaleString() || 0}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-[hsl(var(--temple-accent-gold))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="temple-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Nível Atual</p>
                <p className="text-2xl font-bold text-[hsl(var(--temple-text-primary))]">
                  {userStats?.currentLevel || 1}
                </p>
              </div>
              <Star className="h-8 w-8 text-[hsl(var(--temple-accent-violet))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="temple-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Sequência Atual</p>
                <p className="text-2xl font-bold text-[hsl(var(--temple-text-primary))]">
                  {userStreak?.currentStreak || 0} dias
                </p>
              </div>
              <Flame className="h-8 w-8 text-[hsl(var(--temple-accent-gold))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="temple-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Conquistas</p>
                <p className="text-2xl font-bold text-[hsl(var(--temple-text-primary))]">
                  {userStats?.achievementsCount || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-[hsl(var(--temple-accent-violet))]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <LevelProgress />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Achievements */}
            <Card className="temple-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Conquistas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements?.slice(0, 3).map((achievement: Achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      size="sm"
                      showProgress={false}
                    />
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma conquista recente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Streak Display */}
            <Card className="temple-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Sequência de Atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StreakDisplay streak={userStreak} />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <RecentActivity />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalProgress />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements?.map((achievement: Achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="md"
                showProgress={true}
              />
            )) || (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">Nenhuma conquista encontrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ProgressChart />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <LeaderboardPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GamificationDashboard;
