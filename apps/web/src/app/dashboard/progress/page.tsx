"use client"
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Metadata moved to parent layout or removed for client component compliance

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Progresso</h1>
        <p className="text-muted-foreground">
          Visualize seu desenvolvimento e conquistas ao longo do tempo
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressCharts data={{
            weeklyProgress: [],
            categoryProgress: [],
            dailyActivity: [],
            monthlyGoals: []
          }} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProgressTimeline events={[]} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <ProgressGoals 
            goals={[]}
            onCreateGoal={() => {}}
            onUpdateGoal={() => {}}
            onDeleteGoal={() => {}}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ProgressInsights insights={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
