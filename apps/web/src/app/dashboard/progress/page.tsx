'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCallback } from 'react'
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Trophy, Sparkles } from 'lucide-react'
import { useGamificationStore } from '@/stores/gamificationStore'
import RecentActivity from '@/components/gamification/dashboard/RecentActivity'
import type { PointTransaction } from '@/types/gamification'

// ... (helper functions remain the same)

export default function ProgressPage() {
  // ... (state and hooks remain the same)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trilha de Ascensão</h1>
        <p className="text-muted-foreground">
          Observe sua jornada evolutiva, seus marcos e as energias que você movimenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Energia Acumulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingPoints ? '…' : totalPoints.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Nível atual: {currentLevel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              Sigilos Conquistados
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {achievements
              ?.filter((achievement: any) => Boolean(achievement.unlockedAt))
              .slice(0, 3)
              .map((achievement: any) => (
                <Badge key={achievement.id} variant="secondary">
                  {achievement.name}
                </Badge>
              ))}
            {(!achievements || achievements.filter((a: any) => a.unlockedAt).length === 0) && (
              <span>Nenhum sigilo desbloqueado.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trocas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {recentTransactions?.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center">
                <span className="truncate mr-2">
                  {tx.metadata?.orderNumber ? `Pedido ${tx.metadata.orderNumber}` : getTransactionReasonLabel(tx)}
                </span>
                <Badge variant={tx.points >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {tx.points >= 0 ? '+' : ''}{tx.points}
                </Badge>
              </div>
            ))}
            {(!recentTransactions || recentTransactions.length === 0) && (
              <span className="text-xs">Nenhuma troca registrada.</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panorama</TabsTrigger>
          <TabsTrigger value="timeline">Crônicas</TabsTrigger>
          <TabsTrigger value="goals">Profecias</TabsTrigger>
          <TabsTrigger value="insights">Revelações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressCharts
            data={progressData}
            loading={loading}
            error={error}
            onRetry={fetchProgressData}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProgressTimeline
            events={timelineEvents}
            loading={isLoadingPoints || isLoadingAchievements}
          />
          <RecentActivity />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <ProgressGoals
            goals={goals}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ProgressInsights insights={insights} loading={loading} />
          {error && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">{error}</div>
                <Button variant="outline" size="sm" onClick={fetchProgressData}>
                  Recarregar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
