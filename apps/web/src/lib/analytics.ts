import { prisma } from './prisma'
import { cache } from './cache'
import { WebSocket } from 'ws'

export interface AnalyticsMetric {
  name: string
  category: string
  value: number
  unit?: string
  dimensions?: Record<string, any>
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface AnalyticsEvent {
  name: string
  category: string
  action: string
  label?: string
  value?: number
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  referrer?: string
  page?: string
  properties?: Record<string, any>
}

export interface DashboardConfig {
  widgets: Array<{
    id: string
    type: 'metric' | 'chart' | 'table'
    title: string
    query: string
    config: Record<string, any>
  }>
  layout: Array<{
    i: string
    x: number
    y: number
    w: number
    h: number
  }>
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private wsClients: Set<WebSocket> = new Set()

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  // Registrar métrica
  async recordMetric(metric: AnalyticsMetric): Promise<void> {
    try {
      await prisma.analyticsMetric.create({
        data: {
          name: metric.name,
          category: metric.category,
          value: metric.value,
          unit: metric.unit,
          dimensions: metric.dimensions,
          userId: metric.userId,
          sessionId: metric.sessionId,
          metadata: metric.metadata,
        },
      })

      // Invalidar cache relacionado
      await this.invalidateCache(metric.category, metric.name)

      // Notificar clientes WebSocket
      this.broadcastUpdate('metric', metric)
    } catch (error) {
      console.error('Erro ao registrar métrica:', error)
      throw error
    }
  }

  // Registrar evento
  async recordEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          name: event.name,
          category: event.category,
          action: event.action,
          label: event.label,
          value: event.value,
          userId: event.userId,
          sessionId: event.sessionId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          referrer: event.referrer,
          page: event.page,
          properties: event.properties,
        },
      })

      // Invalidar cache relacionado
      await this.invalidateCache(event.category, event.name)

      // Notificar clientes WebSocket
      this.broadcastUpdate('event', event)
    } catch (error) {
      console.error('Erro ao registrar evento:', error)
      throw error
    }
  }

  // Obter métricas agregadas
  async getMetrics({
    category,
    name,
    startDate,
    endDate,
    userId,
    groupBy = 'day',
  }: {
    category?: string
    name?: string
    startDate?: Date
    endDate?: Date
    userId?: string
    groupBy?: 'hour' | 'day' | 'week' | 'month'
  }): Promise<Array<{ period: string; value: number; count: number }>> {
    const cacheKey = `metrics:${category || 'all'}:${name || 'all'}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}:${userId || 'all'}:${groupBy}`
    
    // Tentar buscar do cache primeiro
    const cached = await cache.get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }

    const where: any = {}
    if (category) where.category = category
    if (name) where.name = name
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const metrics = await prisma.analyticsMetric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    })

    // Agrupar dados por período
    const grouped = this.groupMetricsByPeriod(metrics, groupBy)

    // Cache por 5 minutos
    cache.set(cacheKey, grouped, 300)

    return grouped
  }

  // Obter eventos agregados
  async getEvents({
    category,
    action,
    startDate,
    endDate,
    userId,
    limit = 100,
  }: {
    category?: string
    action?: string
    startDate?: Date
    endDate?: Date
    userId?: string
    limit?: number
  }): Promise<Array<{ id: string; name: string; category: string; action: string; timestamp: Date }>> {
    const cacheKey = `events:${category || 'all'}:${action || 'all'}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}:${userId || 'all'}:${limit}`
    
    const cached = await cache.get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }

    const where: any = {}
    if (category) where.category = category
    if (action) where.action = action
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Cache por 2 minutos
    cache.set(cacheKey, events, 120)

    return events
  }

  // Obter estatísticas do dashboard
  async getDashboardStats(userId?: string): Promise<{
    totalUsers: number
    activeUsers: number
    totalEvents: number
    totalMetrics: number
    topPages: Array<{ page: string; views: number }>
    topEvents: Array<{ name: string; count: number }>
  }> {
    const cacheKey = `dashboard-stats:${userId || 'all'}`
    const cached = await cache.get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [totalUsers, activeUsers, totalEvents, totalMetrics, topPages, topEvents] = await Promise.all([
      // Total de usuários únicos
      prisma.analyticsEvent.findMany({
        select: { userId: true },
        distinct: ['userId'],
        where: { userId: { not: null } },
      }).then(users => users.length),

      // Usuários ativos nas últimas 24h
      prisma.analyticsEvent.findMany({
        select: { userId: true },
        distinct: ['userId'],
        where: {
          userId: { not: null },
          timestamp: { gte: last24h },
        },
      }).then(users => users.length),

      // Total de eventos nos últimos 7 dias
      prisma.analyticsEvent.count({
        where: { timestamp: { gte: last7d } },
      }),

      // Total de métricas nos últimos 7 dias
      prisma.analyticsMetric.count({
        where: { timestamp: { gte: last7d } },
      }),

      // Top páginas
      prisma.analyticsEvent.groupBy({
        by: ['page'],
        where: {
          page: { not: null },
          timestamp: { gte: last7d },
        },
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      }).then(pages => 
        pages.map(p => ({ page: p.page || '', views: p._count.page }))
      ),

      // Top eventos
      prisma.analyticsEvent.groupBy({
        by: ['name'],
        where: { timestamp: { gte: last7d } },
        _count: { name: true },
        orderBy: { _count: { name: 'desc' } },
        take: 10,
      }).then(events => 
        events.map(e => ({ name: e.name, count: e._count.name }))
      ),
    ])

    const stats = {
      totalUsers,
      activeUsers,
      totalEvents,
      totalMetrics,
      topPages,
      topEvents,
    }

    // Cache por 10 minutos
    cache.set(cacheKey, stats, 600)

    return stats
  }

  // Gerenciar dashboards personalizados
  async createDashboard({
    userId,
    name,
    description,
    config,
    isDefault = false,
  }: {
    userId: string
    name: string
    description?: string
    config: DashboardConfig
    isDefault?: boolean
  }): Promise<{ id: string; name: string; description?: string; config: any; isDefault: boolean }> {
    const created = await prisma.analyticsDashboard.create({
      data: {
        userId,
        name,
        description,
        config: config as any,
        isDefault,
      },
    })
    
    return {
      id: created.id,
      name: created.name,
      description: created.description || undefined,
      config: created.config,
      isDefault: created.isDefault
    }
  }

  async getUserDashboards(userId: string): Promise<Array<{ id: string; name: string; description?: string; config: any; isDefault: boolean }>> {
    const dashboards = await prisma.analyticsDashboard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
    })
    
    return dashboards.map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description || undefined,
      config: dashboard.config,
      isDefault: dashboard.isDefault
    }))
  }

  // WebSocket para updates em tempo real
  addWebSocketClient(ws: WebSocket): void {
    this.wsClients.add(ws)
    ws.on('close', () => {
      this.wsClients.delete(ws)
    })
  }

  private broadcastUpdate(type: 'metric' | 'event', data: any): void {
    const message = JSON.stringify({ type, data, timestamp: new Date() })
    this.wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }

  private async invalidateCache(category: string, name?: string): Promise<void> {
    const patterns = [
      `metrics:${category}:.*`,
      `events:${category}:.*`,
      'dashboard-stats:.*',
    ]
    
    if (name) {
      patterns.push(`metrics:${category}:${name}:.*`)
    }

    for (const pattern of patterns) {
      cache.clear(pattern)
    }
  }

  private groupMetricsByPeriod(metrics: any[], groupBy: string): any[] {
    const grouped: Record<string, { timestamp: string; value: number; count: number }> = {}

    metrics.forEach(metric => {
      let key: string
      const date = new Date(metric.timestamp)

      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
          break
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString()
      }

      if (!grouped[key]) {
        grouped[key] = { timestamp: key, value: 0, count: 0 }
      }

      grouped[key].value += metric.value
      grouped[key].count += 1
    })

    return Object.values(grouped).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }
}

export const analyticsService = AnalyticsService.getInstance()