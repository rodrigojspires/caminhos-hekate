import { LRUCache } from 'lru-cache'

// Interface para itens do cache
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

// Configuração do cache
const CACHE_CONFIG = {
  max: 500, // Máximo de 500 itens
  ttl: 1000 * 60 * 15, // 15 minutos por padrão
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
}

// Cache global em memória
const memoryCache = new LRUCache<string, CacheItem<any>>(CACHE_CONFIG)

// Classe para gerenciar cache
export class CacheManager {
  private static instance: CacheManager
  private cache: LRUCache<string, CacheItem<any>>

  private constructor() {
    this.cache = memoryCache
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // Definir item no cache
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_CONFIG.ttl
    }
    this.cache.set(key, item)
  }

  // Obter item do cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined
    
    if (!item) {
      return null
    }

    // Verificar se o item expirou
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  // Verificar se existe no cache
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }

    // Verificar se não expirou
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
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
    return {
      size: this.cache.size,
      max: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
      keys: Array.from(this.cache.keys())
    }
  }

  // Invalidar cache por tags
  invalidateByTag(tag: string): void {
    this.clear(`.*:${tag}:.*`)
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