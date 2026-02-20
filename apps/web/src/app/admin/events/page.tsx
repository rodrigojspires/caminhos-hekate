"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Pencil, Plus, Loader2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

interface EventItem {
  id: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  status?: string
  attendeeCount?: number
  registrationCount?: number
  _count?: {
    registrations?: number
  }
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const removeEvent = async (eventId: string, eventTitle?: string) => {
    if (!confirm(`Deseja excluir o evento${eventTitle ? ` "${eventTitle}"` : ''}?`)) return

    try {
      setDeletingId(eventId)
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao excluir evento')
      }

      setEvents((prev) => prev.filter((eventItem) => eventItem.id.replace(/-r\d+$/, '') !== eventId))
      toast.success('Evento excluído')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir evento')
    } finally {
      setDeletingId(null)
    }
  }

  const groupedEvents = useMemo(() => {
    const groups = new Map<
      string,
      { base?: EventItem; occurrences: EventItem[] }
    >()

    for (const ev of events) {
      const isOccurrence = /-r\d+$/.test(ev.id)
      const baseId = ev.id.replace(/-r\d+$/, '')
      const entry = groups.get(baseId) || { occurrences: [] }
      if (isOccurrence) {
        entry.occurrences.push(ev)
      } else {
        entry.base = ev
      }
      groups.set(baseId, entry)
    }

    return Array.from(groups.entries())
      .map(([baseId, entry]) => ({
        id: baseId,
        base: entry.base || entry.occurrences[0],
        occurrences: entry.occurrences
      }))
      .filter((group) => group.base)
      .sort((a, b) => {
        const aDate = a.base?.startDate ? new Date(a.base.startDate).getTime() : 0
        const bDate = b.base?.startDate ? new Date(b.base.startDate).getTime() : 0
        return aDate - bDate
      })
  }, [events])

  const getNextOccurrenceCount = (group: { base?: EventItem; occurrences: EventItem[] }) => {
    const now = new Date()
    const occurrences = [
      ...(group.base ? [group.base] : []),
      ...group.occurrences
    ].filter((occ) => occ.startDate)
    if (occurrences.length === 0) return 0
    const upcoming = occurrences
      .map((occ) => ({ occ, start: occ.startDate ? new Date(occ.startDate) : null }))
      .filter((item) => item.start && item.start >= now)
      .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0))
    const next = upcoming[0]?.occ || occurrences[0]
    return (
      next?.registrationCount ??
      next?.attendeeCount ??
      next?._count?.registrations ??
      0
    )
  }

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
            {groupedEvents.map((group) => (
              <div key={group.id} className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {group.base?.title}
                  </div>
                  {group.base?.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {group.base.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {group.base?.startDate ? new Date(group.base.startDate).toLocaleDateString('pt-BR') : '--'}
                    {group.base?.endDate ? ` — ${new Date(group.base.endDate).toLocaleDateString('pt-BR')}` : ''}
                  </div>
                  {group.occurrences.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Recorrências: {group.occurrences.length}
                      {(() => {
                        const preview = group.occurrences
                          .slice()
                          .sort((a, b) => {
                            const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
                            const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
                            return aDate - bDate
                          })
                          .slice(0, 6)
                        const remaining = group.occurrences.length - preview.length
                        const previewText = preview
                          .map((occ) =>
                            occ.startDate ? new Date(occ.startDate).toLocaleDateString('pt-BR') : '--'
                          )
                          .join(', ')
                        return previewText
                          ? ` • ${previewText}${remaining > 0 ? ` +${remaining}` : ''}`
                          : ''
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Inscritos: {getNextOccurrenceCount(group)}
                  </span>
                  {group.base?.id && (
                    <button
                      onClick={() => router.push(`/eventos/${group.id}/edit`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/admin/events/${group.id}/attendees`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Users className="w-4 h-4" />
                    Inscritos
                  </button>
                  <button
                    onClick={() => removeEvent(group.id, group.base?.title)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-60"
                    disabled={deletingId === group.id}
                  >
                    {deletingId === group.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Excluir
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
