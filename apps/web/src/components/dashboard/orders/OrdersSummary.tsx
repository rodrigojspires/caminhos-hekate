import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle2, Clock, CreditCard, ShoppingBag } from 'lucide-react'

export interface OrdersStats {
  totalOrders: number
  pendingOrders: number
  awaitingPayment: number
  completedOrders: number
  lastOrderAt: string | null
}

interface OrdersSummaryProps {
  stats: OrdersStats
}

export function OrdersSummary({ stats }: OrdersSummaryProps) {
  const metrics = [
    {
      title: 'Total de pedidos',
      value: stats.totalOrders,
      description: stats.lastOrderAt
        ? `Último pedido em ${formatDateTime(stats.lastOrderAt)}`
        : 'Nenhum pedido ainda',
      icon: ShoppingBag,
    },
    {
      title: 'Aguardando pagamento',
      value: stats.awaitingPayment,
      description: stats.awaitingPayment === 1 ? '1 pedido aguardando' : `${stats.awaitingPayment} pedidos aguardando`,
      icon: CreditCard,
    },
    {
      title: 'Em processamento',
      value: stats.pendingOrders,
      description: stats.pendingOrders === 1 ? '1 pedido em andamento' : `${stats.pendingOrders} pedidos em andamento`,
      icon: Clock,
    },
    {
      title: 'Concluídos',
      value: stats.completedOrders,
      description: stats.completedOrders === 1 ? '1 pedido concluído' : `${stats.completedOrders} pedidos concluídos`,
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ title, value, description, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
