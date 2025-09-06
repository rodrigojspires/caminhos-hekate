import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard'

export const metadata: Metadata = {
  title: 'Gamificação - Caminhos de Hekate',
  description: 'Acompanhe seu progresso, conquistas, medalhas e ranking na plataforma.',
}

export default async function GamificationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gamificação</h1>
        <p className="text-muted-foreground">
          Acompanhe seu progresso, conquistas e compete com outros usuários.
        </p>
      </div>
      
      <GamificationDashboard userId={session.user.id} />
    </div>
  )
}