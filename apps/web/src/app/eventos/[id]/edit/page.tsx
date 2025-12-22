'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar as CalendarIcon, Save, Loader2, CreditCard, MapPin, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionTier } from '@hekate/database'
import { useEventsStore } from '@/stores/eventsStore'
import { UpdateEventRequest } from '@/types/events'

type EventType = 'WEBINAR' | 'WORKSHOP' | 'MEETING' | 'COMMUNITY' | 'CONFERENCE'
type EventAccessType = 'FREE' | 'PAID' | 'TIER'
type EventMode = 'ONLINE' | 'IN_PERSON' | 'HYBRID'
type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LUNAR' | 'none'

interface EventFormState {
  title: string
  description: string
  type: EventType
  category: string
  startDate: string
  endDate: string
  maxParticipants: string
  location: string
  virtualLink: string
  accessType: EventAccessType
  price: string
  freeTiers: SubscriptionTier[]
  mode: EventMode
  isPublic: boolean
  requiresApproval: boolean
  tags: string
  rules: string
  metadata: string
}

const defaultFormState: EventFormState = {
  title: '',
  description: '',
  type: 'WEBINAR',
  category: '',
  startDate: '',
  endDate: '',
  maxParticipants: '',
  location: '',
  virtualLink: '',
  accessType: 'FREE',
  price: '',
  freeTiers: [],
  mode: 'ONLINE',
  isPublic: true,
  requiresApproval: false,
  tags: '',
  rules: '',
  metadata: ''
}

export default function EditEventPage() {
  const params = useParams()
  const eventId = params?.id as string
  const router = useRouter()

  const { selectedEvent, loading, error, fetchEventById, updateEvent } = useEventsStore()
  const [form, setForm] = useState<EventFormState>(defaultFormState)
  const [saving, setSaving] = useState(false)
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState('1')
  const [recurrenceUntil, setRecurrenceUntil] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState('')
  const [recurrenceLunarPhase, setRecurrenceLunarPhase] = useState<'FULL' | 'NEW' | ''>('')

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId)
    }
  }, [eventId, fetchEventById])

  useEffect(() => {
    if (!selectedEvent) return
    const metadata = (selectedEvent as any).metadata
    const recurring = (selectedEvent as any).recurringEvents?.[0]
    const recurrenceRule = recurring?.recurrenceRule

    setForm({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      type: selectedEvent.type as EventType,
      category: (selectedEvent as any).category || '',
      startDate: new Date(selectedEvent.startDate).toISOString().slice(0, 16),
      endDate: new Date(selectedEvent.endDate).toISOString().slice(0, 16),
      maxParticipants: selectedEvent.maxAttendees ? String(selectedEvent.maxAttendees) : '',
      location: selectedEvent.location || '',
      virtualLink: selectedEvent.virtualLink || '',
      accessType: (selectedEvent.accessType || 'FREE') as EventAccessType,
      price: selectedEvent.price ? String(selectedEvent.price) : '',
      freeTiers: (selectedEvent.freeTiers as SubscriptionTier[]) || [],
      mode: (selectedEvent.mode || 'ONLINE') as EventMode,
      isPublic: selectedEvent.isPublic,
      requiresApproval: selectedEvent.requiresApproval,
      tags: selectedEvent.tags?.join(', ') || '',
      rules: (selectedEvent as any).rules
        ? JSON.stringify((selectedEvent as any).rules, null, 2)
        : (metadata?.rules ? JSON.stringify(metadata.rules, null, 2) : ''),
      metadata: metadata ? JSON.stringify(metadata, null, 2) : ''
    })

    if (recurrenceRule?.freq) {
      setRecurrenceEnabled(true)
      setRecurrenceType(recurrenceRule.freq as RecurrenceType)
      setRecurrenceInterval(String(recurrenceRule.interval || 1))
      setRecurrenceUntil(recurrenceRule.until ? new Date(recurrenceRule.until).toISOString().slice(0, 16) : '')
      setRecurrenceCount(recurrenceRule.count ? String(recurrenceRule.count) : '')
      setRecurrenceLunarPhase(recurrenceRule.lunarPhase || '')
    }
  }, [selectedEvent])

  const handleChange = (field: keyof EventFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const parseJsonField = (value: string, label: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    try {
      return JSON.parse(trimmed)
    } catch {
      throw new Error(`Campo ${label} deve ser um JSON válido`)
    }
  }

  async function handleSave() {
    if (!selectedEvent) return
    if (!form.title.trim()) return toast.error('Título é obrigatório')
    if (!form.startDate || !form.endDate) return toast.error('Datas de início e fim são obrigatórias')
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return toast.error('Data de fim não pode ser anterior à data de início')
    }

    const numericFields = ['maxParticipants', 'price'] as const
    const numericLabels: Record<typeof numericFields[number], string> = {
      maxParticipants: 'Máx. participantes',
      price: 'Preço'
    }
    for (const field of numericFields) {
      const raw = form[field].trim()
      if (raw && isNaN(Number(raw))) {
        toast.error(`Campo ${numericLabels[field]} deve ser um número`)
        return
      }
    }

    if (form.accessType === 'PAID' && (!form.price || Number(form.price) <= 0)) {
      return toast.error('Defina um preço para eventos pagos')
    }
    if (form.accessType === 'TIER' && form.freeTiers.length === 0) {
      return toast.error('Selecione ao menos um tier com acesso incluído')
    }
    if (form.mode === 'IN_PERSON' && !form.location.trim()) {
      return toast.error('Informe o local para eventos presenciais')
    }
    if (form.mode === 'ONLINE' && !form.virtualLink.trim()) {
      return toast.error('Informe o link para eventos online')
    }
    if (form.mode === 'HYBRID' && (!form.location.trim() || !form.virtualLink.trim())) {
      return toast.error('Eventos híbridos precisam de local e link')
    }

    try {
      setSaving(true)

      const recurrence =
        recurrenceEnabled && recurrenceType !== 'none'
          ? {
              freq: recurrenceType,
              interval: recurrenceInterval ? Number(recurrenceInterval) : 1,
              until: recurrenceUntil ? new Date(recurrenceUntil).toISOString() : undefined,
              count: recurrenceCount ? Number(recurrenceCount) : undefined,
              lunarPhase: recurrenceType === 'LUNAR' ? (recurrenceLunarPhase || 'FULL') : undefined
            }
          : undefined

      const payload: UpdateEventRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type as any,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maxAttendees: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        location: form.location.trim() || undefined,
        virtualLink: form.virtualLink.trim() || undefined,
        accessType: form.accessType as any,
        price: form.price ? Number(form.price) : undefined,
        freeTiers: form.freeTiers,
        mode: form.mode as any,
        isPublic: form.isPublic,
        requiresApproval: form.requiresApproval,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        rules: parseJsonField(form.rules, 'regras') as any,
        metadata: parseJsonField(form.metadata, 'metadados') as any
      }

      await updateEvent(selectedEvent.id, payload)

      if (recurrenceEnabled && recurrenceType !== 'none') {
        const recurringSeriesId = (selectedEvent as any).recurringEvents?.[0]?.id
        if (recurringSeriesId) {
          const res = await fetch(`/api/events/recurring/${recurringSeriesId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recurrence })
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.error || 'Erro ao atualizar recorrência')
          }
        }
      }

      toast.success('Evento atualizado com sucesso')
      router.push('/admin/events')
    } catch (error) {
      console.error('Erro ao atualizar evento:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar evento')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando evento...
        </div>
      </div>
    )
  }

  if (error || !selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Evento não encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'O evento que você está procurando não existe ou foi removido.'}
          </p>
          <button
            onClick={() => router.push('/admin/events')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Voltar aos eventos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <CalendarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Evento</h1>
            <p className="text-gray-600 dark:text-gray-400">Atualize as informações do evento</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/events')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: Ritual de Lua Cheia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Conte sobre objetivos, prêmios e regras principais do evento."
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de início*</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de fim*</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de evento</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="WEBINAR">Webinar</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="MEETING">Reunião</option>
                <option value="COMMUNITY">Comunidade</option>
                <option value="CONFERENCE">Conferência</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Ritual, Mágica, Comunidade"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configurações</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx. participantes</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxParticipants}
                  onChange={(e) => handleChange('maxParticipants', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ilimitado se vazio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formato</label>
                <select
                  value={form.mode}
                  onChange={(e) => handleChange('mode', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">Presencial</option>
                  <option value="HYBRID">Híbrido</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Endereço (obrigatório se presencial)"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link virtual</label>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.virtualLink}
                    onChange={(e) => handleChange('virtualLink', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://meet..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ex: ritual, online, lua cheia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Regras (JSON opcional)</label>
              <textarea
                rows={3}
                value={form.rules}
                onChange={(e) => handleChange('rules', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder='Ex: {"minLevel":1,"requirements":["Concluir módulo X"]}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metadados (JSON opcional)</label>
              <textarea
                rows={3}
                value={form.metadata}
                onChange={(e) => handleChange('metadata', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder='Ex: {"banner":"/images/evento.png","cta":"Participar agora"}'
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Acesso e preço
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acesso</label>
                  <select
                    value={form.accessType}
                    onChange={(e) => handleChange('accessType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="FREE">Gratuito</option>
                    <option value="PAID">Pago</option>
                    <option value="TIER">Incluído em tiers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={form.accessType !== 'PAID'}
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {form.accessType === 'TIER' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tiers com acesso incluído</label>
                  <div className="flex flex-wrap gap-2">
                    {[SubscriptionTier.INICIADO, SubscriptionTier.ADEPTO, SubscriptionTier.SACERDOCIO].map((tier) => {
                      const active = form.freeTiers.includes(tier)
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              freeTiers: active ? prev.freeTiers.filter((t) => t !== tier) : [...prev.freeTiers, tier]
                            }))
                          }
                          className={`px-3 py-1 rounded border text-sm ${
                            active
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {tier}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  Evento público
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) => setForm((prev) => ({ ...prev, requiresApproval: e.target.checked }))}
                  />
                  Requer aprovação
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">Recorrência</label>
                <p className="text-xs text-muted-foreground">Configure eventos recorrentes (diários, semanais, mensais, anuais ou lua cheia/nova)</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recurrenceEnabled}
                  onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                />
                Ativar
              </label>
            </div>

            {recurrenceEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="none">Não repetir</option>
                      <option value="DAILY">Diário</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="MONTHLY">Mensal</option>
                      <option value="YEARLY">Anual</option>
                      <option value="LUNAR">Lunar (lua cheia/nova)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intervalo</label>
                    <input
                      type="number"
                      min={1}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {recurrenceType === 'LUNAR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fase</label>
                    <select
                      value={recurrenceLunarPhase}
                      onChange={(e) => setRecurrenceLunarPhase(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="FULL">Lua Cheia</option>
                      <option value="NEW">Lua Nova</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Até (data opcional)</label>
                    <input
                      type="datetime-local"
                      value={recurrenceUntil}
                      onChange={(e) => setRecurrenceUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ocorrências (opcional)</label>
                    <input
                      type="number"
                      min={1}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
