'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Flame, TrendingUp, Award, Target } from 'lucide-react';
import { useGamificationStore, useInitializeGamification } from '@/stores/gamificationStore';
import type { Achievement } from '@/types/gamification';
import { AchievementBadge } from '../achievements/AchievementBadge';
import { ProgressChart } from '../charts/ProgressChart';
import { StreakDisplay } from '../streaks/StreakDisplay';
import { LeaderboardPreview } from '../leaderboard/LeaderboardPreview';
import { RecentActivity } from './RecentActivity';
import { LevelProgress } from './LevelProgress';

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
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pontos Totais</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {userStats?.totalPoints?.toLocaleString() || 0}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Nível Atual</p>
                <p className="text-2xl font-bold text-purple-900">
                  {userStats?.currentLevel || 1}
                </p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Sequência Atual</p>
                <p className="text-2xl font-bold text-orange-900">
                  {userStreak?.currentStreak || 0} dias
                </p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Conquistas</p>
                <p className="text-2xl font-bold text-green-900">
                  {userStats?.achievementsCount || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <LevelProgress />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Achievements */}
            <Card>
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
            <Card>
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
