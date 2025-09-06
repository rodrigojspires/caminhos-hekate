"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AchievementsAdmin } from '@/components/admin/gamification/AchievementsAdmin'
import { LeaderboardAdmin } from '@/components/admin/gamification/LeaderboardAdmin'
import { NotificationsAdmin } from '@/components/admin/gamification/NotificationsAdmin'
import { CategoriesAdmin } from '@/components/admin/gamification/CategoriesAdmin'

export default function GamificationAdminPage() {
  const [tab, setTab] = useState('achievements')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Administração de Gamificação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gerencie conquistas, leaderboard e notificações do sistema de gamificação.
          </p>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements">
          <AchievementsAdmin />
        </TabsContent>
        <TabsContent value="leaderboard">
          <LeaderboardAdmin />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsAdmin />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesAdmin />
        </TabsContent>
      </Tabs>
    </div>
  )
}
