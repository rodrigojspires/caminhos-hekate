'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type DashboardStats = {
  totalUsers: number
  activeUsers: number
  totalEvents: number
  totalMetrics: number
  topPages: Array<{ page: string; views: number }>
  topEvents: Array<{ name: string; count: number }>
}

export type UserAnalytics = {
  userId: string
  coursesProgress: Array<{
    courseId: string
    title: string
    progress: number
    timeSpent: number
    lastAccessed: string | null
    completedLessons: number
    totalLessons: number
  }>
  totalStudyTime: number
  completedLessons: number
  certificatesEarned: number
  quizScores: Array<{ id: string; quizId: string; score: number; createdAt: string }>
  activityTimeline: Array<{ id: string; type: string; title: string; action?: string; date: string }>
  learningStreak: number
}

export type AdminOverview = {
  users: { total: number; active: number; newThisMonth: number; retentionRate: number }
  courses: {
    total: number
    published: number
    averageCompletion: number
    mostPopular: Array<{ id: string; title: string; slug: string; enrollments: number }>
  }
  revenue: { total: number; thisMonth: number; growth: number; topProducts: Array<{ productId: string; name: string; revenue: number; quantity: number }> }
  community: { totalPosts: number; totalComments: number; activeUsers: number; engagementRate: number }
  generatedAt: string
}

export type AnalyticsTimeseriesPoint = { period: string; value: number; count: number }
export type AnalyticsEventItem = { 
  id: string
  name: string
  category: string
  action: string
  timestamp: string
  userId?: string
  properties?: any
  user?: {
    name: string | null
    email: string
  }
}

export function useAnalytics(userId?: string, isAdmin: boolean = false) {
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null)
  const [metricsSeries, setMetricsSeries] = useState<AnalyticsTimeseriesPoint[]>([])
  const [recentEvents, setRecentEvents] = useState<AnalyticsEventItem[]>([])

  const rangeToDates = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case '1d': return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now }
      case '7d': return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
      case '30d': return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }
      case '90d': return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now }
      default: return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
    }
  }, [dateRange])

  const fetchStats = useCallback(async () => {
    const response = await fetch(`/api/analytics?type=stats&range=${dateRange}`)
    if (!response.ok) throw new Error('Falha ao carregar estatísticas')
    const data = await response.json()
    setStats(data as DashboardStats)
  }, [dateRange])

  const fetchUserAnalytics = useCallback(async () => {
    if (!userId) return
    const response = await fetch(`/api/analytics/user/${userId}`)
    if (!response.ok) throw new Error('Falha ao carregar analytics do usuário')
    const data = await response.json()
    setUserAnalytics(data as UserAnalytics)
  }, [userId])

  const fetchAdminOverview = useCallback(async () => {
    if (!isAdmin) return
    const response = await fetch('/api/analytics/admin/overview')
    if (!response.ok) throw new Error('Falha ao carregar overview admin')
    const data = await response.json()
    setAdminOverview(data as AdminOverview)
  }, [isAdmin])

  const fetchMetricsSeries = useCallback(async () => {
    const params = new URLSearchParams()
    params.append('type', 'metrics')
    params.append('groupBy', 'day')
    if (rangeToDates.start) params.append('startDate', rangeToDates.start.toISOString())
    if (rangeToDates.end) params.append('endDate', rangeToDates.end.toISOString())

    const response = await fetch(`/api/analytics?${params}`)
    if (!response.ok) throw new Error('Falha ao carregar séries de métricas')
    const data = await response.json()
    setMetricsSeries(Array.isArray(data) ? data as AnalyticsTimeseriesPoint[] : [])
  }, [rangeToDates])

  const fetchRecentEvents = useCallback(async () => {
    const params = new URLSearchParams()
    params.append('type', 'events')
    params.append('period', dateRange)

    const response = await fetch(`/api/analytics?${params}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(errorData.error || 'Falha ao carregar eventos recentes')
    }
    const data = await response.json()
    
    // A API agora retorna { events: [...], period: '7d', isAdmin: boolean }
    const events = data.events || data
    setRecentEvents(Array.isArray(events) ? events.map((event: any) => ({
      id: event.id,
      name: event.action,
      category: event.category,
      action: event.action,
      timestamp: event.createdAt,
      userId: event.userId,
      properties: event.properties,
      user: event.user
    })) : [])
  }, [dateRange])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      await Promise.all([
        fetchStats(),
        fetchMetricsSeries(),
        fetchRecentEvents(),
        fetchUserAnalytics(),
        fetchAdminOverview(),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [fetchStats, fetchMetricsSeries, fetchRecentEvents, fetchUserAnalytics, fetchAdminOverview])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, userId, isAdmin])

  return {
    // state
    stats,
    userAnalytics,
    adminOverview,
    metricsSeries,
    recentEvents,
    dateRange,
    setDateRange,
    loading,
    refreshing,
    error,
    // actions
    refresh,
    fetchRecentEvents,
  }
}

export default useAnalytics

