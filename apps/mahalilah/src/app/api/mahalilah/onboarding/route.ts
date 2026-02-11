import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

const OnboardingScopeSchema = z.enum([
  'dashboard',
  'room_therapist',
  'room_player'
])

const onboardingSelect = {
  mahalilahDashboardOnboardingSeenAt: true,
  mahalilahRoomTherapistOnboardingSeenAt: true,
  mahalilahRoomPlayerOnboardingSeenAt: true
} as const

type OnboardingPreferences = {
  mahalilahDashboardOnboardingSeenAt: Date | null
  mahalilahRoomTherapistOnboardingSeenAt: Date | null
  mahalilahRoomPlayerOnboardingSeenAt: Date | null
}

function formatOnboarding(preferences: OnboardingPreferences | null) {
  return {
    dashboardSeen: Boolean(preferences?.mahalilahDashboardOnboardingSeenAt),
    roomTherapistSeen: Boolean(
      preferences?.mahalilahRoomTherapistOnboardingSeenAt
    ),
    roomPlayerSeen: Boolean(preferences?.mahalilahRoomPlayerOnboardingSeenAt)
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: onboardingSelect
    })

    return NextResponse.json(formatOnboarding(preferences))
  } catch (error) {
    console.error('Erro ao carregar onboarding Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const parsedScope = OnboardingScopeSchema.safeParse(payload?.scope)

    if (!parsedScope.success) {
      return NextResponse.json(
        { error: 'Escopo de onboarding inválido.' },
        { status: 400 }
      )
    }

    const now = new Date()
    const data =
      parsedScope.data === 'dashboard'
        ? { mahalilahDashboardOnboardingSeenAt: now }
        : parsedScope.data === 'room_therapist'
          ? { mahalilahRoomTherapistOnboardingSeenAt: now }
          : { mahalilahRoomPlayerOnboardingSeenAt: now }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data
      },
      update: data,
      select: onboardingSelect
    })

    return NextResponse.json(formatOnboarding(preferences))
  } catch (error) {
    console.error('Erro ao salvar onboarding Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
