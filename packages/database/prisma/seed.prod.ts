import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { seedTherapies } from './seed.therapies'
import { seedMahaLilahInterventions } from './seed.mahalilah-interventions'

// Try to load .env files if dotenv is available; otherwise, continue
async function tryLoadDotenv() {
  try {
    const [{ config }, path] = await Promise.all([
      import('dotenv') as Promise<{ config: (options?: any) => void }>,
      import('path') as Promise<typeof import('path')>,
    ])
    // 1) Repo root .env (../../.env when running from packages/database)
    config({ path: path.resolve(process.cwd(), '../../.env') })
    // 2) Local .env (packages/database/.env) if present
    config()
  } catch {
    // Ignore if dotenv is not installed; rely on environment
  }
}

type SeedSubscriptionPlanInput = {
  tier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
  appScope: 'CAMINHOS' | 'MAHALILAH'
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: Record<string, unknown>
  maxCourses?: number | null
  maxDownloads?: number | null
  metadata?: Record<string, unknown>
}

const SUBSCRIPTION_PLAN_DEFAULTS: SeedSubscriptionPlanInput[] = [
  {
    tier: 'FREE',
    appScope: 'CAMINHOS',
    name: 'Visitante',
    description: 'Acesso gratuito ao conteúdo público',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      access: ['Conteúdo público', 'Comunidade limitada'],
      courses: 0,
      downloads: 0,
    },
  },
  {
    tier: 'INICIADO',
    appScope: 'CAMINHOS',
    name: 'Iniciado',
    description: 'Primeiros passos nos mistérios de Hekate',
    monthlyPrice: 47,
    yearlyPrice: 470,
    features: {
      access: ['Conteúdo Iniciado', 'Comunidade básica', 'Meditações guiadas'],
      courses: 2,
      downloads: 5,
    },
    maxCourses: 2,
    maxDownloads: 5,
  },
  {
    tier: 'ADEPTO',
    appScope: 'CAMINHOS',
    name: 'Adepto',
    description: 'Aprofundamento nos ensinamentos',
    monthlyPrice: 97,
    yearlyPrice: 970,
    features: {
      access: ['Todo conteúdo Adepto', 'Comunidade completa', 'Rituais mensais', 'Suporte prioritário'],
      courses: 5,
      downloads: 15,
    },
    maxCourses: 5,
    maxDownloads: 15,
  },
  {
    tier: 'SACERDOCIO',
    appScope: 'CAMINHOS',
    name: 'Sacerdócio',
    description: 'Acesso completo aos mistérios sagrados',
    monthlyPrice: 197,
    yearlyPrice: 1970,
    features: {
      access: ['Acesso total', 'Mentoria em grupo', 'Rituais exclusivos', 'Certificações'],
      courses: -1,
      downloads: -1,
    },
  },
  {
    tier: 'INICIADO',
    appScope: 'MAHALILAH',
    name: 'Maha Lilah Limitado',
    description: 'Assinatura Maha Lilah com limite mensal de salas.',
    monthlyPrice: 290,
    yearlyPrice: 2900,
    features: {
      access: ['Maha Lilah', 'Até 6 participantes por sala', 'Até 4 salas por mês'],
      maxParticipants: 6,
      roomsPerMonth: 4,
      tipsPerPlayer: 3,
      summaryLimit: 1,
    },
    metadata: {
      app: 'mahalilah',
      planType: 'SUBSCRIPTION_LIMITED',
    },
  },
  {
    tier: 'ADEPTO',
    appScope: 'MAHALILAH',
    name: 'Maha Lilah Ilimitado',
    description: 'Assinatura Maha Lilah com salas ilimitadas.',
    monthlyPrice: 490,
    yearlyPrice: 4900,
    features: {
      access: ['Maha Lilah', 'Até 8 participantes por sala', 'Salas ilimitadas'],
      maxParticipants: 8,
      roomsPerMonth: -1,
      tipsPerPlayer: 5,
      summaryLimit: 2,
    },
    metadata: {
      app: 'mahalilah',
      planType: 'SUBSCRIPTION',
    },
  },
]

async function ensureSubscriptionPlan(
  prisma: PrismaClient,
  plan: SeedSubscriptionPlanInput,
) {
  const db = prisma as any

  const existing = await db.subscriptionPlan.findFirst({
    where: {
      tier: plan.tier,
      appScope: plan.appScope,
    },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await db.subscriptionPlan.create({
    data: {
      tier: plan.tier,
      appScope: plan.appScope,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      features: plan.features,
      maxCourses: plan.maxCourses ?? null,
      maxDownloads: plan.maxDownloads ?? null,
      metadata: plan.metadata ?? null,
    },
    select: { id: true },
  })

  return created.id
}

async function ensureMahaLilahCatalog(
  prisma: PrismaClient,
  mahaLimitedSubscriptionPlanId: string,
  mahaUnlimitedSubscriptionPlanId: string,
) {
  const db = prisma as any

  const singleSessionPlan = await db.mahaLilahPlan.upsert({
    where: { planType: 'SINGLE_SESSION' as any },
    update: {
      allowTherapistSoloPlay: true,
    },
    create: {
      name: 'Sessão avulsa',
      description: 'Pagamento único para uma sala com preço por faixa de participantes.',
      planType: 'SINGLE_SESSION' as any,
      billingType: 'ONE_TIME' as any,
      maxParticipants: 8,
      roomsPerMonth: 1,
      tipsPerPlayer: 3,
      summaryLimit: 1,
      durationDays: 30,
      allowTherapistSoloPlay: true,
      metadata: {
        app: 'mahalilah',
        checkout: 'single_session',
        marketing: {
          forWho: 'Autoguiado, terapeutas iniciando ou grupos eventuais.',
          includes: [
            '1 sala ao vivo',
            'Convites por e-mail',
            'Deck randômico e modo terapia',
            'Dicas de IA: 3 por jogador/sessão',
            'Síntese final por IA: 1 por sessão',
          ],
          limits: [
            'Participantes por sessão: até 8',
            '1-2 participantes: R$ 180,00 · 3-4 participantes: R$ 260,00 · 5-6 participantes: R$ 320,00 · 7-8 participantes: R$ 380,00',
          ],
          ctaLabel: 'Comprar sessão',
          ctaHref: '/checkout',
          aiSummaryLabel: 'Sessão avulsa: 3 dicas/jogador · 1 síntese.',
          highlight: false,
        },
      } as any,
    },
    select: { id: true },
  })

  await db.mahaLilahPlan.upsert({
    where: { planType: 'SUBSCRIPTION' as any },
    update: {
      allowTherapistSoloPlay: true,
    },
    create: {
      name: 'Assinatura ilimitada',
      description: 'Assinatura mensal com salas ilimitadas.',
      planType: 'SUBSCRIPTION' as any,
      billingType: 'RECURRING' as any,
      subscriptionPlanId: mahaUnlimitedSubscriptionPlanId,
      maxParticipants: 8,
      roomsPerMonth: null,
      tipsPerPlayer: 5,
      summaryLimit: 2,
      durationDays: 30,
      allowTherapistSoloPlay: true,
      metadata: {
        app: 'mahalilah',
        checkout: 'subscription_unlimited',
        marketing: {
          forWho: 'Terapeutas e facilitadores com agenda ativa.',
          includes: [
            'Salas ilimitadas no mês',
            'Até 8 participantes por sala',
            'Histórico completo e export',
            'Relatórios e síntese por IA',
            'Suporte prioritário',
          ],
          limits: [
            'Dicas de IA: 5 por jogador/sessão',
            'Síntese final por IA: 2 por sessão',
            'Políticas de uso justo',
          ],
          ctaLabel: 'Assinar plano',
          ctaHref: '/checkout',
          aiSummaryLabel: 'Assinatura ilimitada: 5 dicas/jogador · 2 sínteses.',
          highlight: true,
        },
      } as any,
    },
  })

  await db.mahaLilahPlan.upsert({
    where: { planType: 'SUBSCRIPTION_LIMITED' as any },
    update: {
      allowTherapistSoloPlay: true,
    },
    create: {
      name: 'Assinatura limitada',
      description: 'Assinatura mensal com limite de salas.',
      planType: 'SUBSCRIPTION_LIMITED' as any,
      billingType: 'RECURRING' as any,
      subscriptionPlanId: mahaLimitedSubscriptionPlanId,
      maxParticipants: 6,
      roomsPerMonth: 4,
      tipsPerPlayer: 3,
      summaryLimit: 1,
      durationDays: 30,
      allowTherapistSoloPlay: true,
      metadata: {
        app: 'mahalilah',
        checkout: 'subscription_limited',
        marketing: {
          forWho: 'Profissionais com número fixo de grupos por mês.',
          includes: [
            '4 salas por mês',
            'Convites por e-mail',
            'Até 6 participantes por sala',
            'Deck randômico + modo terapia',
          ],
          limits: [
            'Dicas de IA: 3 por jogador/sessão',
            'Síntese final por IA: 1 por sessão',
            'Salas extras cobradas à parte',
          ],
          ctaLabel: 'Assinar plano',
          ctaHref: '/checkout',
          aiSummaryLabel: 'Assinatura limitada: 3 dicas/jogador · 1 síntese.',
          highlight: false,
        },
      } as any,
    },
  })

  const tierCount = await db.mahaLilahSingleSessionPriceTier.count({
    where: { planId: singleSessionPlan.id },
  })

  if (tierCount === 0) {
    await db.mahaLilahSingleSessionPriceTier.createMany({
      data: [
        {
          planId: singleSessionPlan.id,
          participantsFrom: 1,
          participantsTo: 2,
          pricingMode: 'FIXED_TOTAL' as any,
          fixedPrice: 180,
          sortOrder: 1,
        },
        {
          planId: singleSessionPlan.id,
          participantsFrom: 3,
          participantsTo: 4,
          pricingMode: 'FIXED_TOTAL' as any,
          fixedPrice: 260,
          sortOrder: 2,
        },
        {
          planId: singleSessionPlan.id,
          participantsFrom: 5,
          participantsTo: 6,
          pricingMode: 'FIXED_TOTAL' as any,
          fixedPrice: 320,
          sortOrder: 3,
        },
        {
          planId: singleSessionPlan.id,
          participantsFrom: 7,
          participantsTo: 8,
          pricingMode: 'FIXED_TOTAL' as any,
          fixedPrice: 380,
          sortOrder: 4,
        },
      ],
    })
  }
}

export async function runSeedProd() {
  await tryLoadDotenv()
  const prisma = new PrismaClient()

  try {
    console.log('🌱 Iniciando seed de produção (idempotente, não destrutivo)...')

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@caminhosdehekate.com.br'
    const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } })

    if (!adminExists) {
      const adminPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'HekateAdmin#2024',
        10,
      )

      await prisma.user.create({
        data: {
          email: adminEmail,
          password: adminPassword,
          name: 'Administrador',
          role: 'ADMIN',
          subscriptionTier: 'SACERDOCIO',
          emailVerified: new Date(),
        },
      })
      console.log('✅ Usuário admin criado')
    } else {
      console.log('ℹ️ Usuário admin já existe, mantendo dados')
    }

    const subscriptionPlanIds = new Map<string, string>()
    for (const plan of SUBSCRIPTION_PLAN_DEFAULTS) {
      const id = await ensureSubscriptionPlan(prisma, plan)
      subscriptionPlanIds.set(`${plan.tier}:${plan.appScope}`, id)
    }

    const mahaLimitedSubscriptionPlanId = subscriptionPlanIds.get('INICIADO:MAHALILAH')
    const mahaUnlimitedSubscriptionPlanId = subscriptionPlanIds.get('ADEPTO:MAHALILAH')

    if (!mahaLimitedSubscriptionPlanId || !mahaUnlimitedSubscriptionPlanId) {
      throw new Error('Planos de assinatura Maha Lilah não encontrados para criar o catálogo.')
    }

    await ensureMahaLilahCatalog(
      prisma,
      mahaLimitedSubscriptionPlanId,
      mahaUnlimitedSubscriptionPlanId,
    )
    await seedMahaLilahInterventions(prisma)

    await seedTherapies(prisma)

    console.log('✅ Seed de produção finalizado sem apagar dados existentes')
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.prod.ts')) {
  runSeedProd()
    .then(() => {
      console.log('🎉 Seed de produção concluído')
    })
    .catch((error) => {
      console.error('❌ Erro no seed de produção:', error)
      process.exit(1)
    })
}
