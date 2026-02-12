// Interface para itens do cache
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  lastAccessAt: number
}

// Configuração do cache
const CACHE_CONFIG = {
  max: 500, // Máximo de 500 itens
  ttl: 1000 * 60 * 15, // 15 minutos por padrão
}

function isExpired(item: CacheItem<unknown>): boolean {
  return Date.now() - item.timestamp > item.ttl
}

// Classe para gerenciar cache
export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheItem<unknown>>

  private constructor() {
    this.cache = new Map()
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // Definir item no cache
  set<T>(key: string, data: T, ttl?: number): void {
    this.purgeExpired()

    const effectiveTTL = ttl || CACHE_CONFIG.ttl
    const now = Date.now()
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: effectiveTTL,
      lastAccessAt: now
    }
    this.cache.set(key, item as CacheItem<unknown>)

    this.ensureCapacity()
  }

  // Obter item do cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined
    
    if (!item) {
      return null
    }

    // Verificar se o item expirou
    if (isExpired(item)) {
      this.cache.delete(key)
      return null
    }

    item.lastAccessAt = Date.now()
    this.cache.set(key, item as CacheItem<unknown>)

    return item.data
  }

  // Verificar se existe no cache
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }

    // Verificar se não expirou
    if (isExpired(item)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // Remover item do cache
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Limpar cache por padrão
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Limpar por padrão usando regex
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Obter estatísticas do cache
  getStats() {
    this.purgeExpired()

    return {
      size: this.cache.size,
      max: CACHE_CONFIG.max,
      calculatedSize: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  // Invalidar cache por tags
  invalidateByTag(tag: string): void {
    this.clear(`.*:${tag}:.*`)
  }

  private ensureCapacity(): void {
    if (this.cache.size <= CACHE_CONFIG.max) return

    let keyToEvict: string | null = null
    let oldestAccess = Number.POSITIVE_INFINITY

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessAt < oldestAccess) {
        oldestAccess = item.lastAccessAt
        keyToEvict = key
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
    }
  }

  private purgeExpired(): void {
    for (const [key, item] of this.cache.entries()) {
      if (isExpired(item)) {
        this.cache.delete(key)
      }
    }
  }
}

// Instância singleton do cache
export const cache = CacheManager.getInstance()

// Utilitários específicos para configurações
export const SettingsCache = {
  // Chaves de cache para configurações
  KEYS: {
    ALL_SETTINGS: 'settings:all',
    SETTINGS_BY_TYPE: (type: string) => `settings:type:${type}`,
    SETTING_BY_KEY: (key: string) => `settings:key:${key}`,
    SEARCH_RESULTS: (query: string) => `settings:search:${query}`
  },

  // TTL específico para configurações (30 minutos)
  TTL: 1000 * 60 * 30,

  // Invalidar cache de configurações
  invalidate(): void {
    cache.clear('settings:.*')
  },

  // Invalidar por tipo
  invalidateByType(type: string): void {
    cache.delete(this.KEYS.SETTINGS_BY_TYPE(type))
    cache.delete(this.KEYS.ALL_SETTINGS)
    cache.clear('settings:search:.*')
  },

  // Invalidar por chave específica
  invalidateByKey(key: string): void {
    cache.delete(this.KEYS.SETTING_BY_KEY(key))
    cache.delete(this.KEYS.ALL_SETTINGS)
    cache.clear('settings:search:.*')
  }
}

// Decorator para cache automático
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = keyGenerator(...args)
      
      // Tentar obter do cache primeiro
      const cachedResult = cache.get(cacheKey)
      if (cachedResult !== null) {
        return cachedResult
      }

      // Executar método original
      const result = await method.apply(this, args)
      
      // Armazenar no cache
      cache.set(cacheKey, result, ttl)
      
      return result
    }

    return descriptor
  }
}
