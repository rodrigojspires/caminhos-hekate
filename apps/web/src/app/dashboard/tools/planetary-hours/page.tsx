"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Chaldean order and day rulers
const CHALDEAN: Array<"Saturn"|"Jupiter"|"Mars"|"Sun"|"Venus"|"Mercury"|"Moon"> = [
  "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"
]
const DAY_RULER: Record<string, typeof CHALDEAN[number]> = {
  Sunday: "Sun",
  Monday: "Moon",
  Tuesday: "Mars",
  Wednesday: "Mercury",
  Thursday: "Jupiter",
  Friday: "Venus",
  Saturday: "Saturn",
}
const PLANET_PT: Record<typeof CHALDEAN[number], { name: string; emoji: string; color: string }> = {
  Saturn: { name: "Saturno", emoji: "♄", color: "#111827" },
  Jupiter: { name: "Júpiter", emoji: "♃", color: "#2563eb" },
  Mars: { name: "Marte", emoji: "♂", color: "#dc2626" },
  Sun: { name: "Sol", emoji: "☉", color: "#f59e0b" },
  Venus: { name: "Vênus", emoji: "♀", color: "#16a34a" },
  Mercury: { name: "Mercúrio", emoji: "☿", color: "#7c3aed" },
  Moon: { name: "Lua", emoji: "☾", color: "#6b7280" },
}

function formatTime(d: Date, tz?: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz || undefined }).format(d)
  } catch {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }
}
function formatDate(d: Date, tz?: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: tz || undefined }).format(d)
  } catch {
    return d.toLocaleDateString("pt-BR")
  }
}
function ymd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate()+days)
  return d
}

async function geocodeCity(name: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`
  const r = await fetch(url)
  if (!r.ok) throw new Error("Falha ao buscar cidade")
  const j = await r.json()
  const item = j?.results?.[0]
  if (!item) throw new Error("Cidade não encontrada")
  return {
    label: `${item.name}${item.admin1 ? ", "+item.admin1 : ""}${item.country ? ", "+item.country : ""}`,
    lat: item.latitude,
    lon: item.longitude,
    tz: item.timezone as string,
  }
}

async function getSunriseSunset(lat: number, lon: number, startYmd: string, endYmd: string) {
  // Open-Meteo astronomy API: two days window to get sunrise today and next sunrise
  const url = `https://api.open-meteo.com/v1/astronomy?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&start_date=${startYmd}&end_date=${endYmd}`
  const r = await fetch(url)
  if (!r.ok) throw new Error("Falha ao obter horários do Sol")
  const j = await r.json()
  const tz = j.timezone as string | undefined
  const dates: string[] = j.daily?.time || []
  const rise: string[] = j.daily?.sunrise || []
  const set: string[] = j.daily?.sunset || []
  return { tz, dates, rise, set }
}

function splitInterval(start: Date, end: Date, parts: number) {
  const out: Date[] = []
  const ms = end.getTime() - start.getTime()
  for (let i=0;i<=parts;i++) {
    out.push(new Date(start.getTime() + (ms*i)/parts))
  }
  return out
}

function weekdayName(date: Date, tz?: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz || undefined }).format(date)
  } catch {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)
  }
}

type HourRow = {
  n: number
  period: "Dia"|"Noite"
  start: Date
  end: Date
  planet: typeof CHALDEAN[number]
}

export default function PlanetaryHoursPage() {
  const [dateStr, setDateStr] = useState<string>(() => ymd(new Date()))
  const [cityQuery, setCityQuery] = useState<string>("")
  const [loc, setLoc] = useState<{label:string,lat:number,lon:number,tz?:string}|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [rows, setRows] = useState<HourRow[]|null>(null)
  const [dayRuler, setDayRuler] = useState<typeof CHALDEAN[number] | null>(null)

  const computeTable = useCallback(async (dStr: string, location: {lat:number,lon:number}) => {
    setError("")
    setLoading(true)
    try {
      const d0 = new Date(`${dStr}T12:00:00Z`) // midday reference
      const d1 = addDays(d0, 1)
      const data = await getSunriseSunset(location.lat, location.lon, ymd(d0), ymd(d1))
      // Find indices for dates
      const idx0 = data.dates.findIndex((s: string) => s === ymd(d0))
      const idx1 = data.dates.findIndex((s: string) => s === ymd(d1))
      if (idx0 < 0 || idx1 < 0) throw new Error("Dados astronômicos incompletos")
      const tz = data.tz

      const sunrise0 = new Date(data.rise[idx0])
      const sunset0 = new Date(data.set[idx0])
      const sunrise1 = new Date(data.rise[idx1])

      const dayParts = splitInterval(sunrise0, sunset0, 12)
      const nightParts = splitInterval(sunset0, sunrise1, 12)

      const weekday = weekdayName(sunrise0, tz)
      const ruler = DAY_RULER[weekday]
      setDayRuler(ruler)

      // Build 24-hour planetary sequence starting from day ruler at day hour 1
      const startIdx = CHALDEAN.indexOf(ruler)
      const seq: typeof CHALDEAN[number][] = []
      for (let i=0;i<24;i++) seq.push(CHALDEAN[(startIdx + i) % CHALDEAN.length])

      const out: HourRow[] = []
      for (let i=0;i<12;i++) {
        out.push({ n: i+1, period: "Dia", start: dayParts[i], end: dayParts[i+1], planet: seq[i] })
      }
      for (let i=0;i<12;i++) {
        out.push({ n: 13+i, period: "Noite", start: nightParts[i], end: nightParts[i+1], planet: seq[12+i] })
      }
      setRows(out)
      // set timezone if missing
      setLoc(prev => prev ? { ...prev, tz } : prev)
    } catch (e: any) {
      setRows(null)
      setError(e?.message || "Erro ao calcular horas planetárias")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loc) {
      computeTable(dateStr, loc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, loc?.lat, loc?.lon])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cityQuery.trim()) return
    try {
      setLoading(true)
      const g = await geocodeCity(cityQuery.trim())
      setLoc(g)
    } catch (e: any) {
      setError(e?.message || "Não foi possível encontrar a cidade")
    } finally { setLoading(false) }
  }

  const handleUseMyLocation = async () => {
    setError("")
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada pelo navegador")
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        // reverse lookup minimal label
        setLoc({ label: `Coords ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, lat: latitude, lon: longitude })
      } finally {
        setLoading(false)
      }
    }, () => {
      setLoading(false)
      setError("Não foi possível obter a localização")
    })
  }

  const headerSubtitle = useMemo(() => {
    if (!loc) return "Selecione a data e o local para calcular as 24 horas planetárias (ordem caldaica)."
    const d = new Date(`${dateStr}T12:00:00Z`)
    return `${formatDate(d, loc.tz)} • ${loc.label}`
  }, [loc, dateStr])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Horas Planetárias</h1>
          <p className="text-muted-foreground">{headerSubtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros</CardTitle>
          <CardDescription>Escolha a data e o local. Você pode buscar uma cidade ou usar sua localização atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <form className="md:col-span-2" onSubmit={handleSearch}>
              <label className="text-sm font-medium">Cidade</label>
              <div className="flex gap-2">
                <Input placeholder="Ex.: São Paulo" value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} />
                <Button type="submit" disabled={loading}>Buscar</Button>
                <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={loading}>Usar minha localização</Button>
              </div>
            </form>
          </div>
          {loc && (
            <div className="text-sm text-muted-foreground">
              Local: <span className="font-medium text-foreground">{loc.label}</span>{loc.tz ? <span> • Fuso: {loc.tz}</span> : null}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela</CardTitle>
          <CardDescription>Horas diurnas e noturnas calculadas a partir do nascer/pôr do Sol (12 + 12).</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows && (
            <p className="text-sm text-muted-foreground">Informe uma cidade ou localização para gerar a tabela.</p>
          )}
          {rows && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Período</th>
                    <th className="py-2 pr-2">Planeta</th>
                    <th className="py-2 pr-2">Início</th>
                    <th className="py-2 pr-2">Fim</th>
                    <th className="py-2 pr-2">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const minutes = Math.round((r.end.getTime() - r.start.getTime())/60000)
                    const info = PLANET_PT[r.planet]
                    const isDay = r.period === "Dia"
                    return (
                      <tr key={i} className={`${i%2?"bg-muted/30":""}`}>
                        <td className="py-2 pr-2 font-mono">{r.n}</td>
                        <td className="py-2 pr-2">{isDay ? <Badge variant="secondary">Diurna</Badge> : <Badge variant="outline">Noturna</Badge>}</td>
                        <td className="py-2 pr-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white" style={{ backgroundColor: info.color }}>
                              {info.emoji}
                            </span>
                            {info.name}
                          </span>
                        </td>
                        <td className="py-2 pr-2">{formatTime(r.start, loc?.tz)}</td>
                        <td className="py-2 pr-2">{formatTime(r.end, loc?.tz)}</td>
                        <td className="py-2 pr-2">{Math.floor(minutes/60)}h {String(minutes%60).padStart(2,'0')}m</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {dayRuler && (
            <p className="text-xs text-muted-foreground mt-3">Regente do dia: {PLANET_PT[dayRuler].name}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}