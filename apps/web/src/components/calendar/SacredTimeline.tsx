"use client"

import { useMemo } from 'react'
import { useEventsStore } from '@/stores/eventsStore'
import { CalendarEvent } from '@/types/events'
import { Sun, Moon } from 'lucide-react'
import { TorchIcon } from '@/components/icons/Esoteric'

function categoryOf(e: CalendarEvent): 'SABBATH' | 'DEIPNON' | 'RITUAL' | null {
  const text = `${e.title} ${(e.tags || []).join(' ')}`.toLowerCase()
  if (/sabb(a|)t|sabbaths?/.test(text)) return 'SABBATH'
  if (/deipnon/.test(text)) return 'DEIPNON'
  if (/ritual|rito/.test(text)) return 'RITUAL'
  return null
}

function fmtDate(d: Date) {
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

export default function SacredTimeline() {
  const { events } = useEventsStore()

  const items = useMemo(() => {
    const now = new Date()
    const upcoming = events.filter((e) => new Date(e.start) >= now)
    const buckets: Record<'SABBATH' | 'DEIPNON' | 'RITUAL', CalendarEvent[]> = {
      SABBATH: [],
      DEIPNON: [],
      RITUAL: [],
    }
    for (const e of upcoming) {
      const cat = categoryOf(e)
      if (!cat) continue
      buckets[cat].push(e)
    }
    Object.values(buckets).forEach((arr) => arr.sort((a, b) => +new Date(a.start) - +new Date(b.start)))
    const merged: Array<{ cat: 'SABBATH' | 'DEIPNON' | 'RITUAL'; e: CalendarEvent }> = []
    // Interleave first 2 of each category
    for (let i = 0; i < 2; i++) {
      if (buckets.SABBATH[i]) merged.push({ cat: 'SABBATH', e: buckets.SABBATH[i] })
      if (buckets.DEIPNON[i]) merged.push({ cat: 'DEIPNON', e: buckets.DEIPNON[i] })
      if (buckets.RITUAL[i]) merged.push({ cat: 'RITUAL', e: buckets.RITUAL[i] })
    }
    return merged
  }, [events])

  if (!items.length) return null

  return (
    <div className="relative rounded-2xl border border-hekate-gold/20 p-4 md:p-6 bg-hekate-gray-900/40 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(218,165,32,.15), transparent 55%)' }} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl md:text-2xl font-bold text-hekate-gold">Linha do Tempo Sagrada</h3>
      </div>

      <div className="relative">
        {/* timeline line */}
        <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-hekate-gold/40 to-transparent" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map(({ cat, e }, idx) => (
            <a key={e.id + idx} href={`/eventos/${e.id}`} className="group relative rounded-lg p-4 hover:bg-hekate-purple-950/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full border border-hekate-gold/50 p-2 bg-hekate-black">
                  {cat === 'SABBATH' && <Sun className="h-4 w-4 text-hekate-gold" />}
                  {cat === 'DEIPNON' && <Moon className="h-4 w-4 text-hekate-gold" />}
                  {cat === 'RITUAL' && <TorchIcon className="h-4 w-4 text-hekate-gold" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-hekate-pearl/70 uppercase tracking-wide">{cat === 'SABBATH' ? 'Sabbath' : cat === 'DEIPNON' ? 'Deipnon' : 'Ritual'}</div>
                  <div className="font-medium text-hekate-pearl truncate group-hover:text-hekate-gold">{e.title}</div>
                  <div className="text-xs text-hekate-pearl/60">{fmtDate(e.start)} • {e.location || 'Online'}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
