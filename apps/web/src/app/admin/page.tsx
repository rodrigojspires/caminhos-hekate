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

export default function AdminDashboard() {
  const { user, isLoading } = useAdminSession()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const metrics: MetricCardProps[] = [
    {
      title: "Total de Usuários",
      value: 1234,
      change: {
        value: 12,
        type: "increase",
        period: "este mês"
      },
      icon: Users,
      color: "blue"
    },
    {
      title: "Pedidos do Mês",
      value: 89,
      change: {
        value: 23,
        type: "increase",
        period: "este mês"
      },
      icon: ShoppingCart,
      color: "green"
    },
    {
      title: "Receita Total",
      value: "R$ 45.231",
      change: {
        value: 18,
        type: "increase",
        period: "este mês"
      },
      icon: DollarSign,
      color: "purple"
    },
    {
      title: "Cursos Ativos",
      value: 12,
      change: {
        value: 2,
        type: "increase",
        period: "este mês"
      },
      icon: BookOpen,
      color: "orange"
    }
  ]

  const recentActivities: Activity[] = [
    {
      id: "1",
      type: "user",
      title: "Novo usuário registrado",
      description: "Maria Silva se cadastrou na plataforma",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      user: { name: "Maria Silva" }
    },
    {
      id: "2",
      type: "order",
      title: "Pedido realizado",
      description: "João Santos fez um pedido de R$ 299,90",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      user: { name: "João Santos" }
    },
    {
      id: "3",
      type: "course",
      title: "Curso publicado",
      description: "Novo curso 'Tarot Avançado' foi publicado",
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      user: { name: "Admin" }
    },
    {
      id: "4",
      type: "system",
      title: "Comentário em post",
      description: "Ana Costa comentou no post sobre rituais",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: { name: "Ana Costa" }
    }
  ]

  const salesData: LineChartData[] = [
    { label: "Jan", value: 4000 },
    { label: "Fev", value: 3000 },
    { label: "Mar", value: 5000 },
    { label: "Abr", value: 4500 },
    { label: "Mai", value: 6000 },
    { label: "Jun", value: 5500 },
    { label: "Jul", value: 7000 }
  ]

  const categoryData: BarChartData[] = [
    { label: "Cursos", value: 45, color: "#8b5cf6" },
    { label: "Consultas", value: 32, color: "#06b6d4" },
    { label: "Produtos", value: 28, color: "#10b981" },
    { label: "Eventos", value: 15, color: "#f59e0b" }
  ]

  const userTypeData: DonutChartData[] = [
    { label: "Estudantes", value: 65, color: "#8b5cf6" },
    { label: "Praticantes", value: 25, color: "#06b6d4" },
    { label: "Mestres", value: 10, color: "#10b981" }
  ]

  const quickStats = [
    {
      label: "Taxa de Conversão",
      value: "3.2%",
      trend: { value: 0.5, direction: "up" as const }
    },
    {
      label: "Ticket Médio",
      value: "R$ 187",
      trend: { value: 12, direction: "up" as const }
    },
    {
      label: "Satisfação",
      value: "4.8/5",
      trend: { value: 2, direction: "down" as const }
    },
    {
      label: "Retenção",
      value: "78%",
      trend: { value: 5, direction: "up" as const }
    }
  ]

  const quickActions = [
    {
      title: "Gerenciar Usuários",
      description: "Visualizar e editar usuários",
      icon: Users,
      href: "/admin/users"
    },
    {
      title: "Ver Pedidos",
      description: "Acompanhar pedidos recentes",
      icon: ShoppingCart,
      href: "/admin/orders"
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bem-vindo, {user?.name || 'Admin'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Aqui está um resumo das atividades da plataforma Caminhos de Hekate.
        </p>
      </div>

      {/* Stats Grid */}
      <StatsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <RecentActivity 
            activities={recentActivities}
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
          title="Vendas dos Últimos 7 Meses"
          color="#8b5cf6"
        />
        
        <SimpleBarChart
          data={categoryData}
          title="Vendas por Categoria"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <SimpleDonutChart
          data={userTypeData}
          title="Tipos de Usuários"
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