"use client"

import { useAdminSession } from "@/hooks/use-admin-session"
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  BookOpen,
  Plus,
  FileText
} from "lucide-react"
import { 
  StatsGrid, 
  RecentActivity, 
  QuickStats,
  type MetricCardProps,
  type Activity
} from "@/components/admin/Dashboard"
import { 
  SimpleLineChart, 
  SimpleBarChart, 
  SimpleDonutChart,
  type LineChartData,
  type BarChartData,
  type DonutChartData
} from "@/components/admin/Charts"
import { Navigation } from "@/components/admin"
import { useEffect, useMemo, useState } from "react"
import { useAnalytics } from "@/hooks/useAnalytics"

export default function AdminDashboard() {
  const { user, isLoading } = useAdminSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  
  const { recentEvents, loading: eventsLoading, fetchRecentEvents } = useAnalytics()

  type UsersStats = {
    overview: { totalUsers: number; newUsers: number; premiumUsers: number; conversionRate: number }
    distribution: { subscription: Array<{ type: string | null; count: number }> }
  }
  type OrdersReport = {
    summary: { totalOrders: number; totalRevenue: number; avgOrderValue: number; ordersGrowth: number; revenueGrowth: number }
    ordersByStatus: Array<{ status: string; count: number; revenue: number }>
    salesByDay: Array<{ date: string; orders: number; revenue: number }>
  }
  type CoursesStats = {
    overview: { totalCourses: number; totalEnrollments: number; totalRevenue: number; averagePrice: number; enrollmentGrowth: number }
  }

  const [usersStats, setUsersStats] = useState<UsersStats | null>(null)
  const [ordersReport, setOrdersReport] = useState<OrdersReport | null>(null)
  const [coursesStats, setCoursesStats] = useState<CoursesStats | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [u, o, c] = await Promise.all([
          fetch("/api/admin/users/stats").then(r => r.ok ? r.json() : Promise.reject(new Error("users/stats failed"))),
          fetch("/api/admin/orders/reports").then(r => r.ok ? r.json() : Promise.reject(new Error("orders/reports failed"))),
          fetch("/api/admin/courses/stats").then(r => r.ok ? r.json() : Promise.reject(new Error("courses/stats failed"))),
        ])
        if (cancelled) return
        setUsersStats(u)
        setOrdersReport(o)
        setCoursesStats(c)
        
        // Fetch recent events for activities
        await fetchRecentEvents()
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar dados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [fetchRecentEvents])
  
  // Map events to activities format
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      const mappedActivities = recentEvents.map((event: any) => {
        const type = (event.category === 'order' || event.category === 'user' || event.category === 'course')
          ? event.category
          : 'system'
        const title = event.name || event.action || 'Atividade'
        const description = [event.category, event.action].filter(Boolean).join(' • ')
        const timestamp = event.timestamp || event.createdAt
        const user = event.user ? { name: event.user.name || event.user.email || 'Usuário' } : undefined
        return {
          id: event.id,
          type,
          title,
          description,
          timestamp,
          user,
        }
      })
      setRecentActivities(mappedActivities)
    } else {
      setRecentActivities([])
    }
  }, [recentEvents])

  const metrics: MetricCardProps[] = useMemo(() => {
    const u = usersStats?.overview
    const o = ordersReport?.summary
    const c = coursesStats?.overview
    const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return [
      {
        title: "Total de Usuários",
        value: u?.totalUsers ?? 0,
        change: u ? { value: u.newUsers, type: "increase", period: "período" } : undefined,
        icon: Users,
        color: "blue"
      },
      {
        title: "Pedidos (período)",
        value: o?.totalOrders ?? 0,
        change: o ? { value: Math.round(o.ordersGrowth), type: (o.ordersGrowth >= 0 ? "increase" : "decrease"), period: "vs. anterior" } : undefined,
        icon: ShoppingCart,
        color: "green"
      },
      {
        title: "Receita (período)",
        value: o ? fmtBRL(Number(o.totalRevenue || 0)) : fmtBRL(0),
        change: o ? { value: Math.round(o.revenueGrowth), type: (o.revenueGrowth >= 0 ? "increase" : "decrease"), period: "vs. anterior" } : undefined,
        icon: DollarSign,
        color: "purple"
      },
      {
        title: "Cursos",
        value: c?.totalCourses ?? 0,
        change: c ? { value: Math.round(c.enrollmentGrowth), type: (c.enrollmentGrowth >= 0 ? "increase" : "decrease"), period: "matrículas" } : undefined,
        icon: BookOpen,
        color: "orange"
      }
    ] as MetricCardProps[]
  }, [usersStats, ordersReport, coursesStats])



  const salesData: LineChartData[] = useMemo(() => {
    const s = ordersReport?.salesByDay || []
    return s
      .slice()
      .reverse()
      .map(d => ({ label: new Date(d.date).toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }), value: Number(d.revenue || 0) }))
  }, [ordersReport])

  const categoryData: BarChartData[] = useMemo(() => {
    // Usar pedidos por status como barras simples
    const byStatus = ordersReport?.ordersByStatus || []
    return byStatus.map(s => ({ label: s.status, value: s.count }))
  }, [ordersReport])

  const userTypeData: DonutChartData[] = useMemo(() => {
    const dist = usersStats?.distribution.subscription || []
    return dist.map(d => ({ label: d.type || 'N/A', value: d.count }))
  }, [usersStats])

  const quickStats = useMemo(() => {
    const u = usersStats?.overview
    const o = ordersReport?.summary
    return [
      u && { label: "Conversão", value: `${u.conversionRate?.toFixed?.(2) ?? 0}%`, trend: { value: Math.round((o?.ordersGrowth ?? 0)), direction: (o?.ordersGrowth ?? 0) >= 0 ? 'up' : 'down' } },
      o && { label: "Ticket Médio", value: (Number(o.avgOrderValue || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), trend: { value: 0, direction: 'up' } },
      usersStats && { label: "Premium", value: usersStats.overview.premiumUsers, trend: { value: 0, direction: 'up' } },
      coursesStats && { label: "Cursos", value: coursesStats.overview.totalCourses, trend: { value: Math.round(coursesStats.overview.enrollmentGrowth), direction: (coursesStats.overview.enrollmentGrowth >= 0 ? 'up' : 'down') } },
    ].filter(Boolean) as Array<{ label: string; value: string | number; trend?: { value: number; direction: 'up' | 'down' } }>
  }, [usersStats, ordersReport, coursesStats])

  const newUsersCount = usersStats?.overview?.newUsers ?? 0
  const newOrdersCount = ordersReport?.summary ? Math.max(0, Math.round(ordersReport.summary.ordersGrowth)) : 0

  const quickActions = [
    {
      title: "Gerenciar Usuários",
      description: "Visualizar e editar usuários",
      icon: Users,
      href: "/admin/users",
      badge: newUsersCount > 0 ? {
        count: newUsersCount,
        variant: "secondary" as const
      } : undefined
    },
    {
      title: "Ver Pedidos",
      description: "Acompanhar pedidos recentes",
      icon: ShoppingCart,
      href: "/admin/orders",
      badge: newOrdersCount > 0 ? {
        count: newOrdersCount,
        variant: "destructive" as const
      } : undefined
    },
    {
      title: "Criar Curso",
      description: "Adicionar novo curso",
      icon: Plus,
      href: "/admin/courses/new"
    },
    {
      title: "Ver Relatórios",
      description: "Análises e métricas",
      icon: FileText,
      href: "/admin/reports"
    }
  ]

  return (
    <div className="space-y-6">
      {(isLoading) && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bem-vindo, {user?.name || 'Admin'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Aqui está um resumo das atividades da plataforma Caminhos de Hekate.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <StatsGrid metrics={metrics} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <RecentActivity 
            activities={recentActivities}
            loading={eventsLoading}
            onViewAll={() => console.log('Ver todas atividades')}
          />
        </div>

        {/* Quick Stats */}
        <QuickStats stats={quickStats} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart
          data={salesData}
          title="Receita por Dia"
          color="#8b5cf6"
        />
        
        <SimpleBarChart
          data={categoryData}
          title="Pedidos por Status"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <SimpleDonutChart
          data={userTypeData}
          title="Assinaturas por Tier"
          size={180}
        />

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Navigation
            variant="pills"
            items={quickActions.map(action => ({
              label: action.title,
              href: action.href,
              description: action.description,
              icon: action.icon
            }))}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  )
}
