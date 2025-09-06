import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { cache, SettingsCache } from '@/lib/cache'
import {
  CreateSystemSettingsSchema,
  UpdateSystemSettingsSchema,
  SettingsFiltersSchema,
  BulkUpdateSettingsSchema
} from '@/lib/validations/settings'
import { z } from 'zod'

// GET /api/admin/settings - Listar configurações do sistema
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Validar e parsear filtros
    const filters = SettingsFiltersSchema.parse({
      type: searchParams.get('type'),
      search: searchParams.get('search'),
      category: searchParams.get('category'),
      isPublic: searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    // Gerar chave de cache
    const cacheKey = filters.search 
      ? SettingsCache.KEYS.SEARCH_RESULTS(JSON.stringify(filters))
      : filters.type 
        ? SettingsCache.KEYS.SETTINGS_BY_TYPE(filters.type)
        : SettingsCache.KEYS.ALL_SETTINGS

    // Tentar obter do cache
    const cachedResult = cache.get(cacheKey)
    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    // Construir query do Prisma
    const where: any = {}
    
    if (filters.type) {
      where.type = filters.type
    }
    
    if (filters.category) {
      where.category = filters.category
    }
    
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic
    }
    
    if (filters.search) {
      where.OR = [
        { key: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } }
      ]
    }
    
    // Filtros adicionais podem ser implementados aqui no futuro

    // Calcular offset para paginação
    const offset = (filters.page - 1) * filters.limit

    // Buscar configurações com paginação
    const [settings, total] = await Promise.all([
      prisma.systemSettings.findMany({
        where,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: offset,
        take: filters.limit
      }),
      prisma.systemSettings.count({ where })
    ])

    const result = {
      settings,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      },
      filters
    }

    // Armazenar no cache
    cache.set(cacheKey, result, SettingsCache.TTL)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/settings - Criar nova configuração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreateSystemSettingsSchema.parse(body)

    // Validação básica do valor
    if (!data.value || data.value.trim() === '') {
      return NextResponse.json(
        { error: 'Valor não pode estar vazio' },
        { status: 400 }
      )
    }

    // Verificar se a configuração já existe
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: data.key }
    })

    if (existingSetting) {
      return NextResponse.json(
        { error: 'Configuração já existe' },
        { status: 409 }
      )
    }

    const setting = await prisma.systemSettings.create({
      data: {
        ...data,
        name: data.name || data.key // Usar name fornecido ou key como fallback
      }
    })

    // Invalidar cache
    SettingsCache.invalidate()
    SettingsCache.invalidateByType(data.type)

    return NextResponse.json(setting, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar configuração:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Atualizar configurações em lote
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = BulkUpdateSettingsSchema.parse(body)

    // Validar cada configuração individualmente
    const validationErrors: Array<{ index: number; key: string; error: string }> = []
    
    data.settings.forEach((setting, index) => {
      if (!setting.value || setting.value.trim() === '') {
        validationErrors.push({
          index,
          key: setting.key,
          error: 'Valor não pode estar vazio'
        })
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Valores inválidos encontrados', details: validationErrors },
        { status: 400 }
      )
    }

    // Atualizar configurações em transação
    const updatedSettings = await prisma.$transaction(
      data.settings.map(setting =>
        prisma.systemSettings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            updatedAt: new Date()
          },
          create: {
            key: setting.key,
            value: setting.value,
            type: 'STRING',
            category: 'GENERAL',
            name: setting.key
          }
        })
      )
    )

    // Invalidar todo o cache de configurações
    SettingsCache.invalidate()

    return NextResponse.json({ 
      message: 'Configurações atualizadas com sucesso',
      settings: updatedSettings,
      count: updatedSettings.length
    })
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}