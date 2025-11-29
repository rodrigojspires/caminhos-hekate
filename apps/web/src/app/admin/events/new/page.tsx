"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar as CalendarIcon, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type EventType = 'COMPETITION' | 'CHALLENGE' | 'TOURNAMENT'

interface EventFormState {
  title: string
  description: string
  eventType: EventType
  category: string
  startDate: string
  endDate: string
  maxParticipants: string
  entryFeePoints: string
  prizePoolPoints: string
  rules: string
  metadata: string
}

const defaultFormState: EventFormState = {
  title: '',
  description: '',
  eventType: 'COMPETITION',
  category: '',
  startDate: '',
  endDate: '',
  maxParticipants: '',
  entryFeePoints: '',
  prizePoolPoints: '',
  rules: '',
  metadata: ''
}

export default function NewAdminEventPage() {
  const router = useRouter()
  const [form, setForm] = useState<EventFormState>(defaultFormState)
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof EventFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const parseJsonField = (value: string, label: string) => {
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
      return JSON.parse(trimmed)
    } catch {
      throw new Error(`Campo ${label} deve ser um JSON válido`)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Datas de início e fim são obrigatórias')
      return
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('Data de fim não pode ser anterior à data de início')
      return
    }

    const numericFields = ['maxParticipants', 'entryFeePoints', 'prizePoolPoints'] as const
    const numericLabels: Record<typeof numericFields[number], string> = {
      maxParticipants: 'Máx. participantes',
      entryFeePoints: 'Taxa de entrada',
      prizePoolPoints: 'Premiação'
    }
    for (const field of numericFields) {
      const raw = form[field].trim()
      if (raw && isNaN(Number(raw))) {
        toast.error(`Campo ${numericLabels[field]} deve ser um número`)
        return
      }
    }

    try {
      setSaving(true)

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        eventType: form.eventType,
        category: form.category.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
        entryFeePoints: form.entryFeePoints ? Number(form.entryFeePoints) : 0,
        prizePoolPoints: form.prizePoolPoints ? Number(form.prizePoolPoints) : 0,
        rules: parseJsonField(form.rules, 'regras'),
        metadata: parseJsonField(form.metadata, 'metadados')
      }

      const response = await fetch('/api/gamification/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar evento')
      }

      toast.success('Evento criado com sucesso')
      router.push('/admin/events')
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar evento')
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Evento</h1>
            <p className="text-gray-600 dark:text-gray-400">Configure um novo evento gamificado</p>
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
            Salvar evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Torneio de Magia Sazonal"
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
                  value={form.eventType}
                  onChange={(e) => handleChange('eventType', e.target.value as EventType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="COMPETITION">Competição</option>
                  <option value="CHALLENGE">Desafio</option>
                  <option value="TOURNAMENT">Torneio</option>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa de entrada (pontos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.entryFeePoints}
                  onChange={(e) => handleChange('entryFeePoints', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Premiação (pontos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.prizePoolPoints}
                  onChange={(e) => handleChange('prizePoolPoints', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
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
      </div>
    </div>
  )
}
