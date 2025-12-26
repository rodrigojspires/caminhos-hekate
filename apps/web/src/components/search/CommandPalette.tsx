'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'

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
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div 
        className="mx-auto mt-24 max-w-2xl glass rounded-lg border border-hekate-gold/20 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="text-hekate-pearl">
          <div className="border-b border-hekate-gold/20 px-4">
            <div className="flex items-center gap-3 h-14" cmdk-input-wrapper="">
              <Search className="text-hekate-pearl/50" size={20} />
              <input
                autoFocus
                className="w-full h-full bg-transparent text-base outline-none placeholder:text-hekate-pearl/40"
                placeholder="Busque por cursos, produtos, posts, usuários…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="hidden sm:block text-xs text-hekate-pearl/50 p-1.5 rounded-md border border-hekate-gold/20">ESC</kbd>
            </div>
          </div>
          <Command.List className="max-h-96 overflow-auto p-2">
            {!query && (
              <Command.Empty className="p-4 text-center text-sm text-hekate-pearl/60">Digite para buscar…</Command.Empty>
            )}
            {query && results.length === 0 && (
              <Command.Empty className="p-4 text-center text-sm text-hekate-pearl/60">Sem resultados</Command.Empty>
            )}
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group 
                key={group} 
                heading={group.toUpperCase()}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-hekate-gold [&_[cmdk-group-heading]]:tracking-wider"
              >
                {items.map((item: any) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => { setOpen(false); router.push(item.url) }}
                    className="px-3 py-2 rounded-md cursor-pointer aria-selected:bg-white/10 flex flex-col items-start gap-1"
                  >
                    <div className="text-sm font-medium text-hekate-pearl">{item.title}</div>
                    <div 
                      className="text-xs text-hekate-pearl/70 line-clamp-2" 
                      dangerouslySetInnerHTML={{ __html: item.snippet || item.summary || '' }} 
                    />
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
