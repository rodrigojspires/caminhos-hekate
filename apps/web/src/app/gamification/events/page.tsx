import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Eventos e Competições - Gamificação',
}

async function fetchEvents() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/gamification/events`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function GamificationEventsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const events = await fetchEvents()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Eventos e Competições</h1>
      <p className="text-muted-foreground mb-6">Participe de desafios sazonais e acompanhe o placar.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events?.map((ev: any) => (
          <div key={ev.id} className="border rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">{ev.name}</h2>
              <span className="text-xs px-2 py-1 rounded bg-muted">{ev.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{ev.description}</p>
            <div className="text-xs text-muted-foreground mt-2">Período: {new Date(ev.startsAt).toLocaleDateString()} — {new Date(ev.endsAt).toLocaleDateString()}</div>
            <form action={`/api/gamification/events/${ev.id}/enroll`} method="post" className="mt-3">
              <button className="text-sm px-3 py-2 border rounded-md" type="submit">Inscrever-se</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}

