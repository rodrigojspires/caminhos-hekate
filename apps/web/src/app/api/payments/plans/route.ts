import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export const dynamic = 'force-dynamic'

function mapFeaturesToList(features: any, plan: any): string[] {
  const list: string[] = []
  if (!features) return list
  // Access list if provided
  if (Array.isArray(features.access)) {
    for (const it of features.access) if (typeof it === 'string') list.push(it)
  }
  // Courses limit
  if (typeof features.courses === 'number') {
    if (features.courses < 0) list.push('Cursos ilimitados')
    else if (features.courses > 0) list.push(`Até ${features.courses} cursos`)
  } else if (typeof plan.maxCourses === 'number') {
    if (plan.maxCourses < 0) list.push('Cursos ilimitados')
    else if (plan.maxCourses > 0) list.push(`Até ${plan.maxCourses} cursos`)
  }
  // Downloads limit
  if (typeof features.downloads === 'number') {
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

    const plans = await prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { intervalCount: 'asc' },
    })

    const data = plans.map((p) => {
      const features: any = p.features as any
      const featuresList = Array.isArray(features)
        ? (features as string[])
        : mapFeaturesToList(features, p)

      // Heurística simples para destacar um plano popular (meio da faixa)
      const popularTier = 'ADEPTO'
      const isPopular = (p.tier as any) === popularTier

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
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error listing plans:', error)
    return NextResponse.json({ success: false, error: 'Failed to list plans' }, { status: 500 })
  }
}

