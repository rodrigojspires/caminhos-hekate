import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { OrdersTable, type OrderRow } from '@/components/dashboard/orders/OrdersTable'
import { OrdersSummary, type OrdersStats } from '@/components/dashboard/orders/OrdersSummary'

export const metadata: Metadata = {
  title: 'Pedidos da Loja | Minha Escola',
  description: 'Consulte seus pedidos recentes e finalize pagamentos pendentes.',
}

const emptyStats: OrdersStats = {
  totalOrders: 0,
  pendingOrders: 0,
  awaitingPayment: 0,
  completedOrders: 0,
  lastOrderAt: null,
}

async function fetchOrders(cookieHeader: string | null) {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/user/orders`, {
      cache: 'no-store',
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    })

    if (response.status === 401) {
      redirect('/auth/login')
    }

    if (!response.ok) {
      console.error('Falha ao carregar pedidos do usuário:', response.status)
      return { orders: [] as OrderRow[], stats: emptyStats }
    }

    const data = (await response.json()) as { orders: OrderRow[]; stats: OrdersStats }
    return {
      orders: data.orders ?? [],
      stats: data.stats ?? emptyStats,
    }
  } catch (error) {
    console.error('Erro ao consultar pedidos do usuário:', error)
    return { orders: [] as OrderRow[], stats: emptyStats }
  }
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  const cookieStore = cookies()
  const cookieHeader = cookieStore.getAll().length ? cookieStore.toString() : null
  const { orders, stats } = await fetchOrders(cookieHeader)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Pedidos da Loja</h1>
        <p className="text-muted-foreground">
          Visualize seus pedidos e conclua pagamentos pendentes quando necessário.
        </p>
      </div>

      <OrdersSummary stats={stats} />

      <OrdersTable orders={orders} />
    </div>
  )
}
