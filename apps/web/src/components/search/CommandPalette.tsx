"use client"
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<any[]>([])
  const router = useRouter()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!query) { setResults([]); return }
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const grouped = React.useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const r of results) {
      const g = r.entityType || 'outros'
      if (!map[g]) map[g] = []
      map[g].push(r)
    }
    return map
  }, [results])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <Command className="rounded-md border bg-background text-foreground shadow-lg">
          <div className="border-b px-3">
            <div className="flex items-center gap-2" cmdk-input-wrapper="">
              <input
                autoFocus
                className="w-full bg-transparent py-3 text-sm outline-none"
                placeholder="Busque por cursos, produtos, posts, usuários…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="text-xs text-muted-foreground">ESC</kbd>
            </div>
          </div>
          <Command.List className="max-h-80 overflow-auto">
            {!query && (
              <Command.Empty className="p-4 text-sm text-muted-foreground">Digite para buscar…</Command.Empty>
            )}
            {query && results.length === 0 && (
              <Command.Empty className="p-4 text-sm text-muted-foreground">Sem resultados</Command.Empty>
            )}
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group key={group} heading={group.toUpperCase()}>
                {items.map((item: any) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => { setOpen(false); router.push(item.url) }}
                    className="px-3 py-2"
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: item.snippet || item.summary || '' }} />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
