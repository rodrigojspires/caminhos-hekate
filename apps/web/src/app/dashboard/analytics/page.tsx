import { Metadata } from 'next'
import { AnalyticsDashboard } from '@/components/analytics'

export const metadata: Metadata = {
  title: 'Analytics | Minha Escola',
  description: 'Analytics da Minha Escola com métricas em tempo real e relatórios detalhados',
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Acompanhe métricas, eventos e performance em tempo real
          </p>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </div>
  )
}
