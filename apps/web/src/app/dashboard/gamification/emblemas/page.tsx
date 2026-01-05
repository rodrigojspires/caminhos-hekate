'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resolveMediaUrl } from '@/lib/utils'

interface CatalogBadge {
  id: string
  name: string
  description: string
  icon?: string | null
  rarity: string
  points: number
  category?: { id: string; name: string }
}

interface UserAchievementItem {
  achievementId: string
}

export default function BadgesPage() {
  const [catalog, setCatalog] = useState<CatalogBadge[]>([])
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [catalogRes, unlockedRes] = await Promise.all([
          fetch('/api/gamification/achievements/catalog'),
          fetch('/api/gamification/achievements?unlocked=true')
        ])
        const catalogJson = catalogRes.ok ? await catalogRes.json() : { achievements: [] }
        const unlockedJson = unlockedRes.ok ? await unlockedRes.json() : { achievements: [] }
        if (cancelled) return

        const unlockedIds = new Set<string>(
          (unlockedJson.achievements || []).map((item: UserAchievementItem) => item.achievementId)
        )
        setCatalog(catalogJson.achievements || [])
        setUnlocked(unlockedIds)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = catalog.length
    const unlockedCount = catalog.filter((item) => unlocked.has(item.id)).length
    return { total, unlockedCount }
  }, [catalog, unlocked])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emblemas</h1>
          <p className="text-muted-foreground">
            Todos os emblemas possíveis. Os seus ficam coloridos.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/gamification">Voltar ao Meu Progresso</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.unlockedCount}</p>
            <p className="text-sm text-muted-foreground">Conquistados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {catalog.map((badge) => {
            const isUnlocked = unlocked.has(badge.id)
            const iconUrl = badge.icon ? resolveMediaUrl(badge.icon) || badge.icon : null
            return (
              <div
                key={badge.id}
                className={`rounded-lg border border-border bg-card p-4 transition ${
                  isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={badge.name}
                      className="h-16 w-16 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {badge.category?.name && (
                      <Badge variant="outline" className="text-[10px]">
                        {badge.category.name}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {badge.rarity}
                    </Badge>
                    {badge.points > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {badge.points} pts
                      </Badge>
                    )}
                    {isUnlocked && (
                      <Badge className="text-[10px]">Conquistado</Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
