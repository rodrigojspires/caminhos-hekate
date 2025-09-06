import { prisma } from '@hekate/database'
import { headers } from 'next/headers'

interface SecurityEvent {
  userId: string
  type: 'LOGIN' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'ACCOUNT_ACCESS'
  ipAddress?: string
  userAgent?: string
  location?: string
  metadata?: Record<string, any>
}

interface SuspiciousActivity {
  type: 'SUSPICIOUS_LOGIN' | 'MULTIPLE_FAILED_ATTEMPTS' | 'NEW_DEVICE' | 'UNUSUAL_LOCATION' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  metadata?: Record<string, any>
}

class SecurityMonitor {
  private static instance: SecurityMonitor
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()
  private knownDevices = new Map<string, Set<string>>()
  private knownLocations = new Map<string, Set<string>>()

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  async initialize() {
    // Carregar dispositivos e localizações conhecidos do banco
    await this.loadKnownDevicesAndLocations()
  }

  private async loadKnownDevicesAndLocations() {
    try {
      const loginHistory = await prisma.loginHistory.findMany({
        where: {
          success: true,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
          }
        },
        select: {
          userId: true,
          userAgent: true,
          location: true
        }
      })

      for (const login of loginHistory) {
        if (!this.knownDevices.has(login.userId)) {
          this.knownDevices.set(login.userId, new Set())
        }
        if (!this.knownLocations.has(login.userId)) {
          this.knownLocations.set(login.userId, new Set())
        }

        if (login.userAgent) {
          this.knownDevices.get(login.userId)?.add(this.normalizeUserAgent(login.userAgent))
        }
        if (login.location) {
          this.knownLocations.get(login.userId)?.add(login.location)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos e localizações conhecidos:', error)
    }
  }

  private normalizeUserAgent(userAgent: string): string {
    // Extrair informações básicas do user agent (browser + OS)
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/)
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)
    
    const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : 'Unknown'
    const os = osMatch ? osMatch[1] : 'Unknown'
    
    return `${browser} on ${os}`
  }

  private getLocationFromIP(ipAddress: string): string {
    // Simulação simples de geolocalização por IP
    // Em produção, usar um serviço real como MaxMind ou IPGeolocation
    const ipRanges: Record<string, string> = {
      '127.0.0.1': 'Local',
      '192.168': 'Rede Local',
      '10.0': 'Rede Local',
      '172.16': 'Rede Local'
    }

    for (const [range, location] of Object.entries(ipRanges)) {
      if (ipAddress.startsWith(range)) {
        return location
      }
    }

    // Simulação baseada no primeiro octeto do IP
    const firstOctet = parseInt(ipAddress.split('.')[0])
    if (firstOctet >= 1 && firstOctet <= 50) return 'América do Norte'
    if (firstOctet >= 51 && firstOctet <= 100) return 'Europa'
    if (firstOctet >= 101 && firstOctet <= 150) return 'Ásia'
    if (firstOctet >= 151 && firstOctet <= 200) return 'América do Sul'
    
    return 'Localização Desconhecida'
  }

  async monitorEvent(event: SecurityEvent): Promise<SuspiciousActivity[]> {
    const suspiciousActivities: SuspiciousActivity[] = []
    const { userId, type, ipAddress, userAgent, location } = event

    // Monitorar tentativas de login falhadas
    if (type === 'LOGIN_FAILED') {
      const key = `${userId}-${ipAddress}`
      const current = this.failedAttempts.get(key) || { count: 0, lastAttempt: new Date() }
      
      current.count++
      current.lastAttempt = new Date()
      this.failedAttempts.set(key, current)

      if (current.count >= 5) {
        suspiciousActivities.push({
          type: 'MULTIPLE_FAILED_ATTEMPTS',
          severity: 'HIGH',
          message: `${current.count} tentativas de login falhadas detectadas do IP ${ipAddress}`,
          metadata: { failedAttempts: current.count, ipAddress }
        })
      } else if (current.count >= 3) {
        suspiciousActivities.push({
          type: 'MULTIPLE_FAILED_ATTEMPTS',
          severity: 'MEDIUM',
          message: `${current.count} tentativas de login falhadas detectadas`,
          metadata: { failedAttempts: current.count, ipAddress }
        })
      }
    }

    // Limpar tentativas falhadas em caso de login bem-sucedido
    if (type === 'LOGIN' && ipAddress) {
      const key = `${userId}-${ipAddress}`
      this.failedAttempts.delete(key)
    }

    // Detectar novos dispositivos
    if (type === 'LOGIN' && userAgent) {
      const normalizedUA = this.normalizeUserAgent(userAgent)
      const knownDevices = this.knownDevices.get(userId) || new Set()
      
      if (!knownDevices.has(normalizedUA)) {
        suspiciousActivities.push({
          type: 'NEW_DEVICE',
          severity: 'MEDIUM',
          message: `Login detectado de um novo dispositivo: ${normalizedUA}`,
          metadata: { device: normalizedUA, userAgent }
        })
        
        // Adicionar à lista de dispositivos conhecidos
        knownDevices.add(normalizedUA)
        this.knownDevices.set(userId, knownDevices)
      }
    }

    // Detectar localizações incomuns
    if (type === 'LOGIN' && ipAddress) {
      const detectedLocation = location || this.getLocationFromIP(ipAddress)
      const knownLocations = this.knownLocations.get(userId) || new Set()
      
      if (!knownLocations.has(detectedLocation)) {
        suspiciousActivities.push({
          type: 'UNUSUAL_LOCATION',
          severity: 'HIGH',
          message: `Login detectado de uma localização incomum: ${detectedLocation}`,
          metadata: { location: detectedLocation, ipAddress }
        })
        
        // Adicionar à lista de localizações conhecidas
        knownLocations.add(detectedLocation)
        this.knownLocations.set(userId, knownLocations)
      }
    }

    // Detectar mudanças de senha
    if (type === 'PASSWORD_CHANGE') {
      suspiciousActivities.push({
        type: 'PASSWORD_CHANGE',
        severity: 'MEDIUM',
        message: 'Senha da conta foi alterada',
        metadata: { timestamp: new Date().toISOString() }
      })
    }

    return suspiciousActivities
  }

  async createSecurityAlerts(userId: string, activities: SuspiciousActivity[], ipAddress?: string, userAgent?: string, location?: string) {
    for (const activity of activities) {
      try {
        await prisma.securityAlert.create({
          data: {
            userId,
            type: activity.type,
            severity: activity.severity,
            title: 'Alerta de Segurança',
            description: activity.message,
            metadata: activity.metadata || {},
            ipAddress,
            userAgent,
            location
          }
        })

        // Criar notificação para alertas de alta prioridade
        if (activity.severity === 'HIGH' || activity.severity === 'CRITICAL') {
          await prisma.notification.create({
            data: {
              userId,
              type: 'SECURITY_ALERT',
              title: 'Alerta de Segurança',
              content: activity.message,
              channel: 'EMAIL',
              metadata: {
                severity: activity.severity,
                type: activity.type,
                ...activity.metadata
              }
            }
          })
        }
      } catch (error) {
        console.error('Erro ao criar alerta de segurança:', error)
      }
    }
  }

  // Função utilitária para obter informações da requisição
  static getRequestInfo() {
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     '127.0.0.1'
    const userAgent = headersList.get('user-agent') || 'Unknown'
    
    return { ipAddress, userAgent }
  }
}

export const securityMonitor = SecurityMonitor.getInstance()

// Função helper para monitorar eventos de segurança
export async function monitorSecurityEvent(event: SecurityEvent) {
  try {
    const activities = await securityMonitor.monitorEvent(event)
    
    if (activities.length > 0) {
      await securityMonitor.createSecurityAlerts(
        event.userId,
        activities,
        event.ipAddress,
        event.userAgent,
        event.location
      )
    }
  } catch (error) {
    console.error('Erro ao monitorar evento de segurança:', error)
  }
}