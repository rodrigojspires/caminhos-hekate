'use client'

import React, { useState, useEffect } from 'react'
import { 
  Trophy, Users, Calendar, Gift, TrendingUp, 
  Settings, Plus, Edit, Trash2, Eye, 
  BarChart3, PieChart, Activity, Award
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardStats {
  totalUsers: number
  activeEvents: number
  totalAchievements: number
  totalRewards: number
  pointsDistributed: number
  engagementRate: number
}

interface Event {
  id: string
  title: string
  description: string
  type: string
  status: string
  startDate: string
  endDate: string
  participantCount: number
  maxParticipants?: number
}

interface Achievement {
  id: string
  achievementId: string
  title: string
  description: string
  type: string
  rarity: string
  points: number
  unlockedCount: number
}

interface Reward {
  id: string
  title: string
  description: string
  type: string
  cost: number
  stock?: number
  claimedCount: number
  isActive: boolean
}

export default function GamificationAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch stats
      const statsResponse = await fetch('/api/admin/gamification/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }

      // Fetch events
      const eventsResponse = await fetch('/api/gamification/events')
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setEvents(eventsData.data.events || [])
      }

      // Fetch achievements
      const achievementsResponse = await fetch('/api/gamification/achievements')
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json()
        setAchievements(achievementsData.data.achievements || [])
      }

      // Fetch rewards
      const rewardsResponse = await fetch('/api/gamification/rewards')
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json()
        setRewards(rewardsData.data.rewards || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Stats cards
  const StatCard = ({ title, value, icon: Icon, color, change }: {
    title: string
    value: string | number
    icon: any
    color: string
    change?: string
  }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change} vs mês anterior
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  // Overview tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Usuários Ativos"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="bg-blue-500"
          change="+12%"
        />
        <StatCard
          title="Eventos Ativos"
          value={stats?.activeEvents || 0}
          icon={Calendar}
          color="bg-green-500"
          change="+5%"
        />
        <StatCard
          title="Conquistas Criadas"
          value={stats?.totalAchievements || 0}
          icon={Trophy}
          color="bg-yellow-500"
        />
        <StatCard
          title="Recompensas Disponíveis"
          value={stats?.totalRewards || 0}
          icon={Gift}
          color="bg-purple-500"
        />
        <StatCard
          title="Pontos Distribuídos"
          value={stats?.pointsDistributed?.toLocaleString() || 0}
          icon={Award}
          color="bg-orange-500"
          change="+25%"
        />
        <StatCard
          title="Taxa de Engajamento"
          value={`${stats?.engagementRate || 0}%`}
          icon={TrendingUp}
          color="bg-indigo-500"
          change="+8%"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Eventos Recentes</h3>
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-600">{event.participantCount} participantes</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  event.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conquistas Populares</h3>
          <div className="space-y-3">
            {achievements.slice(0, 5).map((achievement) => (
              <div key={achievement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{achievement.title}</p>
                  <p className="text-sm text-gray-600">{achievement.unlockedCount} desbloqueios</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  achievement.rarity === 'LEGENDARY' ? 'bg-yellow-100 text-yellow-800' :
                  achievement.rarity === 'EPIC' ? 'bg-purple-100 text-purple-800' :
                  achievement.rarity === 'RARE' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {achievement.rarity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Events management tab
  const EventsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gerenciar Eventos</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">{event.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      event.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(event.startDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-yellow-600 hover:text-yellow-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Achievements management tab
  const AchievementsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gerenciar Conquistas</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Conquista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  achievement.rarity === 'LEGENDARY' ? 'bg-yellow-100' :
                  achievement.rarity === 'EPIC' ? 'bg-purple-100' :
                  achievement.rarity === 'RARE' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  <Trophy className={`w-5 h-5 ${
                    achievement.rarity === 'LEGENDARY' ? 'text-yellow-600' :
                    achievement.rarity === 'EPIC' ? 'text-purple-600' :
                    achievement.rarity === 'RARE' ? 'text-blue-600' :
                    'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="text-yellow-600 hover:text-yellow-900">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>
            
            <div className="flex items-center justify-between text-sm">
              <span className={`px-2 py-1 rounded-full font-medium ${
                achievement.rarity === 'LEGENDARY' ? 'bg-yellow-100 text-yellow-800' :
                achievement.rarity === 'EPIC' ? 'bg-purple-100 text-purple-800' :
                achievement.rarity === 'RARE' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {achievement.rarity}
              </span>
              <span className="text-gray-600">
                {achievement.unlockedCount} desbloqueios
              </span>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              {achievement.points} pontos
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Rewards management tab
  const RewardsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gerenciar Recompensas</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Recompensa
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recompensa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resgatadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rewards.map((reward) => (
                <tr key={reward.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{reward.title}</div>
                      <div className="text-sm text-gray-500">{reward.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reward.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reward.cost} pontos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reward.stock || 'Ilimitado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reward.claimedCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reward.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {reward.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-yellow-600 hover:text-yellow-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard de Gamificação
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'events', label: 'Eventos', icon: Calendar },
              { id: 'achievements', label: 'Conquistas', icon: Trophy },
              { id: 'rewards', label: 'Recompensas', icon: Gift },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
        {activeTab === 'rewards' && <RewardsTab />}
      </div>
    </div>
  )
}