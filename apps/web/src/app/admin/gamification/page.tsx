'use client'

import React, { useState, useEffect } from 'react'
import { 
  Trophy, Users, Calendar, Gift, TrendingUp, 
  Settings, Plus, Edit, Trash2, Eye, 
  BarChart3, PieChart, Activity, Award, Target
} from 'lucide-react'
import { toast } from 'sonner'
import {
  GAMIFICATION_POINT_SECTIONS,
  GAMIFICATION_POINT_SETTINGS
} from '@/lib/gamification/point-settings'
import { resolveMediaUrl } from '@/lib/utils'

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
  name: string
  description: string
  icon?: string | null
  rarity: string
  points: number
  isActive: boolean
  category?: { id: string; name: string }
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

interface Goal {
  id: string
  title: string
  description?: string | null
  goalType: string
  metric: string
  targetValue: number
  startDate: string
  endDate: string
  rewardMode?: string
  points: number
  achievementId?: string | null
  isActive: boolean
  achievement?: { id: string; name: string }
}

interface BadgeOption {
  id: string
  name: string
}

interface AchievementCategory {
  id: string
  name: string
}

export default function GamificationAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [badgeOptions, setBadgeOptions] = useState<BadgeOption[]>([])
  const [achievementCategories, setAchievementCategories] = useState<AchievementCategory[]>([])
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    rarity: 'COMMON',
    points: 0,
    icon: '',
    isActive: true
  })
  const [badgeEditingId, setBadgeEditingId] = useState<string | null>(null)
  const [badgeUploading, setBadgeUploading] = useState(false)
  const [badgeSaving, setBadgeSaving] = useState(false)
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    goalType: 'COURSE',
    metric: 'LESSONS_COMPLETED',
    targetValue: 5,
    startDate: '',
    endDate: '',
    rewardMode: 'BOTH',
    points: 0,
    achievementId: '',
    isActive: true
  })
  const [goalEditingId, setGoalEditingId] = useState<string | null>(null)
  const [goalSaving, setGoalSaving] = useState(false)
  const [pointSettings, setPointSettings] = useState<Record<string, number>>({})
  const [pointSettingsLoading, setPointSettingsLoading] = useState(true)
  const [pointSettingsSaving, setPointSettingsSaving] = useState(false)
  const [pointSettingsDirty, setPointSettingsDirty] = useState(false)
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

      // Fetch achievements catalog
      const achievementsResponse = await fetch('/api/admin/gamification/achievements')
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json()
        setAchievements(Array.isArray(achievementsData.data) ? achievementsData.data : [])
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

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/admin/gamification/goals')
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
    }
  }

  const fetchBadgeOptions = async () => {
    try {
      const response = await fetch('/api/admin/gamification/achievements?isActive=true')
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.data) ? data.data : []
        setBadgeOptions(list.map((item: any) => ({ id: item.id, name: item.name })))
      }
    } catch (error) {
      console.error('Erro ao carregar emblemas:', error)
    }
  }

  const fetchAchievementCategories = async () => {
    try {
      const response = await fetch('/api/admin/gamification/categories')
      if (!response.ok) return
      const data = await response.json()
      const list = Array.isArray(data.data) ? data.data : []
      setAchievementCategories(list)
      if (list.length > 0 && !badgeForm.categoryId) {
        setBadgeForm((prev) => ({ ...prev, categoryId: list[0].id }))
      }
    } catch (error) {
      console.error('Erro ao carregar categorias de emblemas:', error)
    }
  }

  const fetchPointSettings = async () => {
    try {
      setPointSettingsLoading(true)
      const response = await fetch('/api/admin/gamification/settings')
      if (!response.ok) {
        throw new Error('Falha ao carregar configuracoes de pontos')
      }
      const data = await response.json()
      const values = (data.settings || []).reduce((acc: Record<string, number>, item: any) => {
        const value = typeof item.value === 'number' ? item.value : Number(item.value)
        acc[item.field] = Number.isFinite(value) ? value : item.defaultValue
        return acc
      }, {})
      setPointSettings(values)
      setPointSettingsDirty(false)
    } catch (error) {
      console.error('Erro ao carregar configuracoes de pontos:', error)
      toast.error('Erro ao carregar configuracoes de pontos')
    } finally {
      setPointSettingsLoading(false)
    }
  }

  const handleSavePointSettings = async () => {
    try {
      setPointSettingsSaving(true)
      const payload = {
        settings: GAMIFICATION_POINT_SETTINGS.map((item) => ({
          key: item.key,
          value: pointSettings[item.field] ?? item.defaultValue
        }))
      }
      const response = await fetch('/api/admin/gamification/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error('Falha ao salvar configuracoes de pontos')
      }
      toast.success('Configuracoes de pontos atualizadas')
      setPointSettingsDirty(false)
    } catch (error) {
      console.error('Erro ao salvar configuracoes de pontos:', error)
      toast.error('Erro ao salvar configuracoes de pontos')
    } finally {
      setPointSettingsSaving(false)
    }
  }

  const handleResetPointSettings = () => {
    const defaults = GAMIFICATION_POINT_SETTINGS.reduce((acc: Record<string, number>, item) => {
      acc[item.field] = item.defaultValue
      return acc
    }, {})
    setPointSettings(defaults)
    setPointSettingsDirty(true)
  }

  useEffect(() => {
    fetchDashboardData()
    fetchPointSettings()
    fetchGoals()
    fetchBadgeOptions()
    fetchAchievementCategories()
  }, [])

  // Stats cards
  const StatCard = ({ title, value, icon: Icon, color, change }: {
    title: string
    value: string | number
    icon: any
    color: string
    change?: string
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {change && (
            <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-400'}`}>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Eventos Recentes</h3>
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{event.participantCount} participantes</p>
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

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Emblemas Recentes</h3>
          <div className="space-y-3">
            {achievements.slice(0, 5).map((achievement) => (
              <div key={achievement.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{achievement.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.points} pontos</p>
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
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cadastro de Emblemas</h2>
          <p className="text-sm text-gray-600">Crie emblemas visuais para metas e conquistas.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        {!achievementCategories.length && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
            Nenhuma categoria de emblemas cadastrada.
            <button
              type="button"
              className="ml-2 text-blue-600 hover:text-blue-800"
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/gamification/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Emblemas', description: 'Emblemas da plataforma' })
                  })
                  if (!response.ok) throw new Error('Erro ao criar categoria')
                  await fetchAchievementCategories()
                  toast.success('Categoria criada')
                } catch (error) {
                  console.error('Erro ao criar categoria:', error)
                  toast.error('Erro ao criar categoria')
                }
              }}
            >
              Criar categoria: Emblemas
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Nome</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={badgeForm.name}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ex: Guardiã da Chama"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Categoria</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={badgeForm.categoryId}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {achievementCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Raridade</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={badgeForm.rarity}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, rarity: event.target.value }))}
            >
              <option value="COMMON">Comum</option>
              <option value="RARE">Rara</option>
              <option value="EPIC">Épica</option>
              <option value="LEGENDARY">Lendária</option>
              <option value="MYTHIC">Mítica</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Pontos</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={badgeForm.points}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, points: Number(event.target.value) }))}
              min={0}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-900">Descrição</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={badgeForm.description}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Resumo do emblema"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-900">Imagem do emblema</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    setBadgeUploading(true)
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('type', 'badges')
                    const response = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                    if (!response.ok) {
                      const error = await response.json()
                      throw new Error(error.message || 'Erro no upload')
                    }
                    const data = await response.json()
                    setBadgeForm((prev) => ({ ...prev, icon: data.url }))
                    toast.success('Imagem enviada')
                  } catch (error) {
                    console.error('Erro no upload:', error)
                    toast.error(error instanceof Error ? error.message : 'Erro no upload')
                  } finally {
                    setBadgeUploading(false)
                  }
                }}
              />
              {badgeUploading && <span className="text-sm text-gray-600">Enviando...</span>}
              {badgeForm.icon && (
                <img
                  src={resolveMediaUrl(badgeForm.icon) || badgeForm.icon}
                  alt="Emblema"
                  className="h-12 w-12 rounded-md object-cover border border-gray-200"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="badge-active"
              type="checkbox"
              checked={badgeForm.isActive}
              onChange={(event) => setBadgeForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <label htmlFor="badge-active" className="text-sm text-gray-700">Emblema ativo</label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            disabled={badgeSaving}
            onClick={async () => {
              try {
                if (!badgeForm.name || !badgeForm.categoryId) {
                  toast.error('Nome e categoria são obrigatórios')
                  return
                }
                setBadgeSaving(true)
                const payload = {
                  name: badgeForm.name,
                  description: badgeForm.description,
                  icon: badgeForm.icon || null,
                  categoryId: badgeForm.categoryId,
                  rarity: badgeForm.rarity,
                  points: badgeForm.points,
                  isActive: badgeForm.isActive
                }
                const response = await fetch(
                  badgeEditingId
                    ? `/api/admin/gamification/achievements/${badgeEditingId}`
                    : '/api/admin/gamification/achievements',
                  {
                    method: badgeEditingId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  }
                )
                if (!response.ok) throw new Error('Erro ao salvar emblema')
                toast.success(badgeEditingId ? 'Emblema atualizado' : 'Emblema criado')
                setBadgeForm({
                  name: '',
                  description: '',
                  categoryId: achievementCategories[0]?.id || '',
                  rarity: 'COMMON',
                  points: 0,
                  icon: '',
                  isActive: true
                })
                setBadgeEditingId(null)
                fetchDashboardData()
                fetchBadgeOptions()
              } catch (error) {
                console.error('Erro ao salvar emblema:', error)
                toast.error('Erro ao salvar emblema')
              } finally {
                setBadgeSaving(false)
              }
            }}
          >
            {badgeSaving ? 'Salvando...' : badgeEditingId ? 'Atualizar emblema' : 'Criar emblema'}
          </button>
          {badgeEditingId && (
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
              onClick={() => {
                setBadgeEditingId(null)
                setBadgeForm({
                  name: '',
                  description: '',
                  categoryId: achievementCategories[0]?.id || '',
                  rarity: 'COMMON',
                  points: 0,
                  icon: '',
                  isActive: true
                })
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {achievement.icon ? (
                  <img
                    src={resolveMediaUrl(achievement.icon) || achievement.icon}
                    alt={achievement.name}
                    className="h-10 w-10 rounded-md object-cover border border-gray-200"
                  />
                ) : (
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
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{achievement.name}</h3>
                  <p className="text-sm text-gray-600">{achievement.category?.name || 'Sem categoria'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="text-yellow-600 hover:text-yellow-900"
                  onClick={() => {
                    setBadgeEditingId(achievement.id)
                    setBadgeForm({
                      name: achievement.name,
                      description: achievement.description,
                      categoryId: achievement.category?.id || '',
                      rarity: achievement.rarity,
                      points: achievement.points || 0,
                      icon: achievement.icon || '',
                      isActive: achievement.isActive
                    })
                  }}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/gamification/achievements/${achievement.id}`, { method: 'DELETE' })
                      if (!response.ok) throw new Error('Erro ao excluir emblema')
                      toast.success('Emblema removido')
                      fetchDashboardData()
                      fetchBadgeOptions()
                    } catch (error) {
                      console.error('Erro ao excluir emblema:', error)
                      toast.error('Erro ao excluir emblema')
                    }
                  }}
                >
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
                {achievement.isActive ? 'Ativo' : 'Inativo'}
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

  const GoalsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Metas</h2>
          <p className="text-sm text-gray-600">Cadastre desafios com prazo, pontos e emblemas.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Título</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.title}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ex: 5 lições na semana"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Tipo</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.goalType}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, goalType: event.target.value }))}
            >
              <option value="COURSE">Curso</option>
              <option value="COMMUNITY">Comunidade</option>
              <option value="PRODUCT">Produto</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Métrica</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.metric}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, metric: event.target.value }))}
            >
              <option value="LESSONS_COMPLETED">Lições concluídas</option>
              <option value="COMMUNITY_MESSAGES">Mensagens na comunidade</option>
              <option value="PRODUCT_PURCHASES">Compras de produtos</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Alvo</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.targetValue}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, targetValue: Number(event.target.value) }))}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Início</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.startDate}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Fim</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.endDate}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Pontos</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.points}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, points: Number(event.target.value) }))}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Recompensa</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.rewardMode}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, rewardMode: event.target.value }))}
            >
              <option value="POINTS">Somente pontos</option>
              <option value="BADGE">Somente emblema</option>
              <option value="BOTH">Pontos + emblema</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Emblema</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.achievementId}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, achievementId: event.target.value }))}
            >
              <option value="">Sem emblema</option>
              {badgeOptions.map((badge) => (
                <option key={badge.id} value={badge.id}>{badge.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Descrição</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={goalForm.description}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Resumo do desafio"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="goal-active"
              type="checkbox"
              checked={goalForm.isActive}
              onChange={(event) => setGoalForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <label htmlFor="goal-active" className="text-sm text-gray-700">Meta ativa</label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                setGoalSaving(true)
                const payload = { ...goalForm }
                const response = await fetch('/api/admin/gamification/goals', {
                  method: goalEditingId ? 'PUT' : 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(goalEditingId ? { id: goalEditingId, ...payload } : payload)
                })
                if (!response.ok) throw new Error('Falha ao salvar meta')
                toast.success(goalEditingId ? 'Meta atualizada' : 'Meta criada')
                setGoalForm({
                  title: '',
                  description: '',
                  goalType: 'COURSE',
                  metric: 'LESSONS_COMPLETED',
                  targetValue: 5,
                  startDate: '',
                  endDate: '',
                  rewardMode: 'BOTH',
                  points: 0,
                  achievementId: '',
                  isActive: true
                })
                setGoalEditingId(null)
                fetchGoals()
              } catch (error) {
                console.error('Erro ao salvar meta:', error)
                toast.error('Erro ao salvar meta')
              } finally {
                setGoalSaving(false)
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            disabled={goalSaving}
          >
            {goalSaving ? 'Salvando...' : goalEditingId ? 'Atualizar meta' : 'Criar meta'}
          </button>
          {goalEditingId && (
            <button
              type="button"
              onClick={() => {
                setGoalEditingId(null)
                setGoalForm({
                  title: '',
                  description: '',
                  goalType: 'COURSE',
                  metric: 'LESSONS_COMPLETED',
                  targetValue: 5,
                  startDate: '',
                  endDate: '',
                  rewardMode: 'BOTH',
                  points: 0,
                  achievementId: '',
                  isActive: true
                })
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alvo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pontos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recompensa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emblema
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
              {goals.map((goal) => (
                <tr key={goal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{goal.title}</div>
                      <div className="text-sm text-gray-500">{goal.description || 'Sem descrição'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.goalType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.targetValue} ({goal.metric})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(goal.startDate).toLocaleDateString('pt-BR')} - {new Date(goal.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.rewardMode || 'BOTH'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.achievement?.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      goal.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {goal.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-yellow-600 hover:text-yellow-900"
                        onClick={() => {
                          setGoalEditingId(goal.id)
                          setGoalForm({
                            title: goal.title,
                            description: goal.description || '',
                            goalType: goal.goalType,
                            metric: goal.metric,
                            targetValue: goal.targetValue,
                            startDate: goal.startDate.slice(0, 10),
                            endDate: goal.endDate.slice(0, 10),
                            rewardMode: goal.rewardMode || 'BOTH',
                            points: goal.points,
                            achievementId: goal.achievementId || '',
                            isActive: goal.isActive
                          })
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/admin/gamification/goals?id=${goal.id}`, { method: 'DELETE' })
                            if (!response.ok) throw new Error('Erro ao deletar meta')
                            toast.success('Meta removida')
                            fetchGoals()
                          } catch (error) {
                            console.error('Erro ao deletar meta:', error)
                            toast.error('Erro ao deletar meta')
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!goals.length && (
                <tr>
                  <td colSpan={9} className="px-6 py-6 text-center text-sm text-gray-500">
                    Nenhuma meta cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const SettingsTab = () => {
    if (pointSettingsLoading) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300">Carregando configuracoes de pontos...</p>
        </div>
      )
    }

    const settingsBySection = GAMIFICATION_POINT_SETTINGS.reduce((acc: Record<string, typeof GAMIFICATION_POINT_SETTINGS>, item) => {
      if (!acc[item.section]) acc[item.section] = []
      acc[item.section].push(item)
      return acc
    }, {})

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configuracoes de Pontos</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ajuste as pontuacoes fixas usadas na gamificacao.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPointSettings}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Restaurar padrao
            </button>
            <button
              type="button"
              onClick={handleSavePointSettings}
              disabled={!pointSettingsDirty || pointSettingsSaving}
              className={`px-4 py-2 rounded-lg text-white ${pointSettingsDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} disabled:cursor-not-allowed`}
            >
              {pointSettingsSaving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </div>

        {Object.entries(settingsBySection).map(([section, items]) => (
          <div key={section} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {GAMIFICATION_POINT_SECTIONS[section as keyof typeof GAMIFICATION_POINT_SECTIONS]}
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.label}
                    </label>
                    <span className="text-xs text-gray-500">{item.key}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.description}</p>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    value={pointSettings[item.field] ?? item.defaultValue}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      setPointSettings((prev) => ({
                        ...prev,
                        [item.field]: Number.isFinite(nextValue) ? nextValue : item.defaultValue
                      }))
                      setPointSettingsDirty(true)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Dashboard de Gamificação
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'events', label: 'Eventos', icon: Calendar },
              { id: 'goals', label: 'Metas', icon: Target },
              { id: 'achievements', label: 'Conquistas', icon: Trophy },
              { id: 'rewards', label: 'Recompensas', icon: Gift },
              { id: 'settings', label: 'Configuracoes', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
        {activeTab === 'rewards' && <RewardsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
