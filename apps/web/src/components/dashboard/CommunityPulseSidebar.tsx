'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface CommunityItem {
  id: string
  name: string
  slug: string
  unreadChatCount: number
}

interface CommunitiesResponse {
  communities: CommunityItem[]
}

interface PostItem {
  id: string
  title: string
  community: { id: string; name: string }
}

interface RecentPostsResponse {
  posts: PostItem[]
}

export function CommunityPulseSidebar() {
  const { apply } = useDashboardVocabulary()
  const [communities, setCommunities] = useState<CommunityItem[]>([])
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [communitiesRes, postsRes] = await Promise.all([
          fetch('/api/communities'),
          fetch('/api/community/posts/recent?limit=4')
        ])
        const communitiesJson: CommunitiesResponse = communitiesRes.ok ? await communitiesRes.json() : { communities: [] }
        const postsJson: RecentPostsResponse = postsRes.ok ? await postsRes.json() : { posts: [] }

        if (cancelled) return

        setCommunities(communitiesJson.communities || [])
        setPosts(postsJson.posts || [])
      } catch {
        if (!cancelled) {
          setCommunities([])
          setPosts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const unreadTotal = communities.reduce((sum, item) => sum + (item.unreadChatCount || 0), 0)

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="text-lg temple-section-title">{apply('Pulso da Comunidade')}</CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {apply('Mensagens e conversas recentes nas suas comunidades.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
          </>
        ) : (
          <>
            <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--temple-text-primary))]">
                  <MessageCircle className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
                  {apply('Mensagens não lidas')}
                </div>
                <Badge variant="secondary" className="temple-chip text-xs">
                  {apply(`${unreadTotal} novas`)}
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {communities.length ? (
                  communities.slice(0, 3).map((community) => (
                    <div key={community.id} className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                      <span>{community.name}</span>
                      <span>{community.unreadChatCount || 0}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[hsl(var(--temple-text-secondary))]">
                    {apply('Sem mensagens pendentes no momento.')}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--temple-text-primary))]">
                <Users className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
                {apply('Últimos posts')}
              </div>
              <div className="mt-3 space-y-2">
                {posts.length ? (
                  posts.map((post) => (
                    <div key={post.id} className="text-xs text-[hsl(var(--temple-text-secondary))]">
                      <span className="block font-medium text-[hsl(var(--temple-text-primary))] line-clamp-1">
                        {post.title}
                      </span>
                      <span className="block">{post.community?.name || apply('Comunidade')}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[hsl(var(--temple-text-secondary))]">
                    {apply('Nenhuma postagem recente disponível.')}
                  </p>
                )}
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/comunidades">{apply('Abrir comunidades')}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
