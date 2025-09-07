"use client"
import { useEffect, useState } from 'react'

export default function QueuesAdminPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/queues/status', { cache: 'no-store' })
        const json = await res.json()
        if (mounted) setData(json)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Erro ao carregar filas')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  if (loading) return <div className="p-6">Carregando filas…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Filas BullMQ</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.stats?.map((s: any) => (
          <div key={s.name} className="border rounded p-4">
            <div className="font-medium mb-2">{s.name}</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {Object.entries(s.counts).map(([k,v]) => (
                <li key={k} className="flex justify-between"><span>{k}</span><span>{v as any}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
