"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Users, Calendar as CalendarIcon, RefreshCw, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface Attendee {
  id: string
  status: string
  registeredAt: string
  metadata?: {
    recurrenceInstanceStart?: string
    recurrenceInstanceId?: string
  } | null
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  guestEmail?: string | null
  guestName?: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function AdminEventAttendeesPage() {
  const params = useParams()
  const eventId = params?.id as string
  const router = useRouter()

  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [eventInfo, setEventInfo] = useState<{ title: string; startDate?: string; endDate?: string } | null>(null)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('all')

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`)
      if (!res.ok) return
      const data = await res.json()
      setEventInfo({
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate
      })
    } catch (e) {
      console.error('Erro ao carregar evento', e)
    }
  }

  const loadAttendees = async (page = 1) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/events/${eventId}/attendees?page=${page}&limit=50`)
      if (!res.ok) throw new Error('Erro ao carregar inscritos')
      const data = await res.json()
      setAttendees(data.attendees || [])
      setPagination(data.pagination)
    } catch (e) {
      console.error('Erro ao carregar inscritos', e)
      setAttendees([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (registrationId: string) => {
    if (!eventId) return
    if (!confirm('Deseja remover este participante?')) return

    try {
      setRemovingId(registrationId)
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao remover participante')
      }

      await loadAttendees(pagination?.page || 1)
    } catch (error) {
      console.error('Erro ao remover participante', error)
    } finally {
      setRemovingId(null)
    }
  }

  useEffect(() => {
    if (!eventId) return
    loadEvent()
    loadAttendees()
  }, [eventId])

  const occurrenceOptions = useMemo(() => {
    const map = new Map<string, string>()
    attendees.forEach((att) => {
      const occurrenceId = att.metadata?.recurrenceInstanceId
      if (!occurrenceId) return
      const label = att.metadata?.recurrenceInstanceStart
        ? new Date(att.metadata.recurrenceInstanceStart).toLocaleString('pt-BR')
        : occurrenceId
      map.set(occurrenceId, label)
    })

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [attendees])

  const filteredAttendees = useMemo(() => {
    if (selectedOccurrenceId === 'all') return attendees
    return attendees.filter((att) => att.metadata?.recurrenceInstanceId === selectedOccurrenceId)
  }, [attendees, selectedOccurrenceId])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      CONFIRMED: 'bg-green-100 text-green-700',
      REGISTERED: 'bg-blue-100 text-blue-700',
      WAITLISTED: 'bg-yellow-100 text-yellow-700',
      CANCELED: 'bg-red-100 text-red-700'
    }
    return <Badge className={map[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h1 className="text-2xl font-bold">Inscritos do Evento</h1>
          </div>
          {eventInfo && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {eventInfo.title} — {eventInfo.startDate ? new Date(eventInfo.startDate).toLocaleDateString('pt-BR') : 'Data não informada'}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadAttendees(pagination?.page || 1)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Lista de inscritos</CardTitle>
          {pagination && (
            <div className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages} — {pagination.total} inscritos
            </div>
          )}
        </CardHeader>
        <Separator />
        <CardContent>
          {occurrenceOptions.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Recorrência:</span>
              <select
                value={selectedOccurrenceId}
                onChange={(e) => setSelectedOccurrenceId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="all">Todas</option>
                {occurrenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando inscritos...
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhum inscrito encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAttendees.map((att) => (
                <div key={att.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={att.user?.image || undefined} alt={att.user?.name || 'Usuário'} />
                    <AvatarFallback>{att.user?.name?.charAt(0) || att.guestName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{att.user?.name || att.guestName || 'Usuário'}</p>
                      {statusBadge(att.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {att.user?.email || att.guestEmail || 'Email não informado'}
                    </p>
                    {(att.metadata?.recurrenceInstanceStart || att.metadata?.recurrenceInstanceId) && (
                      <p className="text-[11px] text-muted-foreground">
                        Recorrência:{' '}
                        {att.metadata?.recurrenceInstanceStart
                          ? new Date(att.metadata.recurrenceInstanceStart).toLocaleString('pt-BR')
                          : att.metadata?.recurrenceInstanceId}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Inscrito em {new Date(att.registeredAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemove(att.id)}
                    disabled={removingId === att.id}
                    title="Remover participante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {pagination && (pagination.hasPrev || pagination.hasNext) && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrev || loading} onClick={() => loadAttendees(pagination.page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!pagination.hasNext || loading} onClick={() => loadAttendees(pagination.page + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
