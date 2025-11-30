"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Plus, Loader2, Users } from 'lucide-react'

interface EventItem {
  id: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  status?: string
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/events?limit=50')
        if (res.ok) {
          const data = await res.json()
          setEvents(data?.events || [])
        } else {
          setEvents([])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Eventos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie eventos e atividades da plataforma</p>
        </div>
        <button
          onClick={() => router.push('/admin/events/new')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Evento
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando eventos...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-300">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-60" />
            Nenhum evento encontrado.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((ev) => (
              <div key={ev.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{ev.title}</div>
                  {ev.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{ev.description}</div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {ev.startDate ? new Date(ev.startDate).toLocaleDateString('pt-BR') : '--'}
                    {ev.endDate ? ` — ${new Date(ev.endDate).toLocaleDateString('pt-BR')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/events/${ev.id}/attendees`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Users className="w-4 h-4" />
                    Inscritos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
