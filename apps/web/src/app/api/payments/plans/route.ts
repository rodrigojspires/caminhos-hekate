import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreatePlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  tier: z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']),
  appScope: z.enum(['CAMINHOS', 'MAHALILAH', 'SHARED']),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  intervalCount: z.coerce.number().int().min(1).max(24).default(1),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  maxCourses: z.union([z.coerce.number().int(), z.null()]).optional(),
  maxDownloads: z.union([z.coerce.number().int(), z.null()]).optional(),
  features: z.unknown().optional(),
  metadata: z.unknown().optional(),
  isActive: z.boolean().optional(),
})

interface PlanFeatures {
  access?: string[];
  courses?: number;
  downloads?: number;
}

interface PlanData {
  maxCourses: number | null;
  maxDownloads: number | null;
  features?: PlanFeatures | string[] | null;
}

function mapFeaturesToList(features: PlanFeatures | string[] | null, plan: PlanData): string[] {
  const list: string[] = []
  if (!features) return list
  // Access list if provided
  if (typeof features === 'object' && !Array.isArray(features) && features.access && Array.isArray(features.access)) {
    for (const it of features.access) if (typeof it === 'string') list.push(it)
  }
  // Courses limit
  if (typeof features === 'object' && !Array.isArray(features) && typeof features.courses === 'number') {
    if (features.courses < 0) list.push('Cursos ilimitados')
    else if (features.courses > 0) list.push(`Até ${features.courses} cursos`)
  } else if (typeof plan.maxCourses === 'number') {
    if (plan.maxCourses < 0) list.push('Cursos ilimitados')
    else if (plan.maxCourses > 0) list.push(`Até ${plan.maxCourses} cursos`)
  }
  // Downloads limit
  if (typeof features === 'object' && !Array.isArray(features) && typeof features.downloads === 'number') {
    if (features.downloads < 0) list.push('Downloads ilimitados')
    else if (features.downloads > 0) list.push(`Até ${features.downloads} downloads`)
  } else if (typeof plan.maxDownloads === 'number') {
    if (plan.maxDownloads < 0) list.push('Downloads ilimitados')
    else if (plan.maxDownloads > 0) list.push(`Até ${plan.maxDownloads} downloads`)
  }
  return list
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('all') === 'true' || searchParams.get('includeInactive') === 'true'
    const appScope = searchParams.get('appScope')
    const includeUsage = searchParams.get('includeUsage') === 'true'

    const allowedScopes =
      appScope === 'ALL'
        ? ['CAMINHOS', 'MAHALILAH', 'SHARED']
        : appScope === 'CAMINHOS' || appScope === 'MAHALILAH' || appScope === 'SHARED'
          ? [appScope]
          : ['CAMINHOS', 'SHARED']

    const plans = await prisma.subscriptionPlan.findMany({
      where: includeInactive
        ? { appScope: { in: allowedScopes as any } }
        : { isActive: true, appScope: { in: allowedScopes as any } },
      orderBy: { intervalCount: 'asc' },
      include: includeUsage
        ? {
            _count: {
              select: {
                userSubscriptions: true
              }
            }
          }
        : undefined,
    })

    let usersByPlanId = new Map<string, number>()
    if (includeUsage && plans.length > 0) {
      const activeSubscriptions = await prisma.userSubscription.findMany({
        where: {
          planId: { in: plans.map((plan) => plan.id) },
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] as any }
        },
        select: { planId: true, userId: true },
        distinct: ['planId', 'userId']
      })

      usersByPlanId = activeSubscriptions.reduce((acc, item) => {
        acc.set(item.planId, (acc.get(item.planId) || 0) + 1)
        return acc
      }, new Map<string, number>())
    }

    const data = plans.map((p) => {
      const features = p.features as PlanFeatures | string[] | null
      const featuresList = Array.isArray(features)
        ? (features as string[])
        : mapFeaturesToList(features, { maxCourses: p.maxCourses ?? null, maxDownloads: p.maxDownloads ?? null, features })

      // Heurística simples para destacar um plano popular (meio da faixa)
      const popularTier = 'ADEPTO'
      const isPopular = p.tier === popularTier

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.monthlyPrice ?? 0), // preço base mensal para exibição
        interval: p.interval,
        intervalCount: p.intervalCount,
        trialDays: typeof p.trialDays === 'number' ? p.trialDays : 0,
        features: featuresList,
        isPopular,
        isActive: p.isActive,
        // Extras úteis para a página poder alternar se desejar
        monthlyPrice: Number(p.monthlyPrice ?? 0),
        yearlyPrice: Number(p.yearlyPrice ?? 0),
        tier: p.tier,
        appScope: (p as any).appScope || 'CAMINHOS',
        usersCount: includeUsage ? usersByPlanId.get(p.id) || 0 : undefined,
        subscriptionsCount: includeUsage ? (p as any)._count?.userSubscriptions || 0 : undefined,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error listing plans:', error)
    return NextResponse.json({ success: false, error: 'Failed to list plans' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await req.json()
    const data = CreatePlanSchema.parse(payload)

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        tier: data.tier as any,
        appScope: data.appScope as any,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        interval: data.interval as any,
        intervalCount: data.intervalCount,
        trialDays: data.trialDays,
        maxCourses: data.maxCourses ?? null,
        maxDownloads: data.maxDownloads ?? null,
        features: (data.features ?? {}) as any,
        metadata: (data.metadata ?? {}) as any,
        isActive: data.isActive ?? true,
      }
    })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating plan:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    )
  }
}
