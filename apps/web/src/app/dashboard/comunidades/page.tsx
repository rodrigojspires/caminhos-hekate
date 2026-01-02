"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Flame, Hash, MessageCircle, TrendingUp, Users } from 'lucide-react'
import NestedComments from '@/components/public/community/NestedComments'

type Community = {
  id: string
  name: string
  slug: string
  description?: string | null
  accessModels: string[]
  tier: string
  price: number | null
  isActive: boolean
  membersCount: number
  isMember: boolean
  membershipStatus: string | null
  allowedByTier: boolean
  accessLabel: string
}

type Topic = {
  id: string
  name: string
  slug: string
  color?: string | null
}

type Post = {
  id: string
  slug: string
  title: string
  content: string | null
  excerpt?: string | null
  createdAt: string
  commentsCount: number
  reactionsCount: number
  viewCount: number
  isPinned: boolean
  locked: boolean
  tier: string
  author: { id: string; name: string; image?: string | null }
  topic?: { id: string; name: string; slug: string; color?: string | null } | null
}

type LeaderboardEntry = {
  rank: number
  userId: string
  user?: { id: string; name?: string | null; image?: string | null } | null
  score: number
}

export default function DashboardCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showInactiveNotice, setShowInactiveNotice] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [postSort, setPostSort] = useState<'recent' | 'popular'>('recent')
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [leaderboardCommunityId, setLeaderboardCommunityId] = useState<string>('all')

  const fetchCommunities = async () => {
    try {
      setLoading(true)
      setShowInactiveNotice(false)
      const res = await fetch('/api/communities', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar comunidades')
      }
      const list = Array.isArray(data.communities) ? data.communities : []
      if (list.length === 0) {
        const fallbackRes = await fetch('/api/communities?includeInactive=1', { cache: 'no-store' })
        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok && Array.isArray(fallbackData.communities)) {
          setCommunities(fallbackData.communities)
          setShowInactiveNotice(true)
          return
        }
      }
      setCommunities(list)
    } catch (error) {
      toast.error('Erro ao carregar comunidades')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/community/topics', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar tópicos')
      }
      setTopics(Array.isArray(data.topics) ? data.topics : [])
    } catch (error) {
      toast.error('Erro ao carregar tópicos')
    }
  }

  const fetchPosts = async () => {
    try {
      setFeedLoading(true)
      const params = new URLSearchParams({ sort: postSort, limit: '12' })
      if (selectedTopicId) params.set('topicId', selectedTopicId)
      const res = await fetch(`/api/community/posts?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar posts')
      }
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch (error) {
      toast.error('Erro ao carregar posts')
    } finally {
      setFeedLoading(false)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({ period: 'monthly', limit: '3' })
      if (leaderboardCommunityId !== 'all') {
        params.set('communityId', leaderboardCommunityId)
      }
      const res = await fetch(`/api/community/leaderboard?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar ranking')
      }
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])
    } catch (error) {
      toast.error('Erro ao carregar ranking')
    }
  }

  useEffect(() => {
    fetchCommunities()
    fetchTopics()
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [selectedTopicId, postSort])

  useEffect(() => {
    fetchLeaderboard()
  }, [leaderboardCommunityId])

  const { myCommunities, availableCommunities } = useMemo(() => {
    const mine = communities.filter((community) => community.isMember)
    const available = communities.filter((community) => !community.isMember)
    return { myCommunities: mine, availableCommunities: available }
  }, [communities])

  const handleEnroll = async (communityId: string) => {
    try {
      setActionId(communityId)
      const res = await fetch(`/api/communities/${communityId}/membership`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao se inscrever')
      }
      await fetchCommunities()
      toast.success(data.status === 'active' ? 'Inscrição confirmada' : 'Inscrição pendente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao se inscrever'
      toast.error(message)
    } finally {
      setActionId(null)
    }
  }

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  const renderCommunityRow = (community: Community) => {
    const isPending = community.membershipStatus === 'pending'
    const isInactive = !community.isActive
    const detailUrl = `/dashboard/comunidades/${community.id}`

    return (
      <div key={community.id} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={detailUrl} className="font-medium text-sm hover:underline">
            {community.name}
          </Link>
          <p className="text-xs text-muted-foreground truncate">{community.accessLabel}</p>
          <p className="text-xs text-muted-foreground">{community.membersCount} membros</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {community.isMember ? (
            <Badge variant={isPending ? 'secondary' : 'default'} className="text-xs">
              {isPending ? 'Pendente' : 'Inscrito'}
            </Badge>
          ) : null}
          {community.isMember ? (
            <Button asChild variant="outline" size="sm">
              <Link href={detailUrl}>Abrir</Link>
            </Button>
          ) : (
            <Button
              onClick={() => handleEnroll(community.id)}
              disabled={actionId === community.id || isInactive}
              size="sm"
            >
              {isInactive ? 'Indisponível' : actionId === community.id ? 'Processando...' : 'Participar'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderPostCard = (post: Post) => {
    const isOpen = openComments.has(post.id)
    const dateLabel = new Date(post.createdAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
    const contentPreview = post.content || post.excerpt || ''

    return (
      <Card key={post.id} className="overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.image || ''} />
                <AvatarFallback>
                  {(post.author.name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{post.author.name || 'Usuário'}</span>
                  {post.isPinned ? <Badge variant="secondary">Fixado</Badge> : null}
                  {post.locked ? <Badge variant="outline">Nível {post.tier}</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateLabel}
                  {post.topic?.name ? ` • ${post.topic.name}` : null}
                </div>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/comunidade/post/${post.slug}`}>Ver post</Link>
            </Button>
          </div>
          <div>
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-3">
              {post.locked ? 'Conteúdo disponível após inscrição.' : contentPreview}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount} comentários
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {post.viewCount} visualizações
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4" />
              {post.reactionsCount} reações
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => toggleComments(post.id)}>
            {isOpen ? 'Ocultar comentários' : 'Comentar'}
          </Button>
          {isOpen ? <NestedComments postId={post.id} locked={post.locked} /> : null}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunidades</h1>
        <p className="text-muted-foreground">
          Um feed no estilo redes sociais para acompanhar posts, tópicos e contribuições recentes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Tópicos em destaque
              </CardTitle>
              <CardDescription>Selecione um tópico para filtrar os posts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant={!selectedTopicId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTopicId(null)}
              >
                Todos
              </Button>
              {topics.map((topic) => (
                <Button
                  key={topic.id}
                  variant={selectedTopicId === topic.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTopicId(topic.id)}
                  style={topic.color ? { borderColor: topic.color, color: topic.color } : undefined}
                >
                  {topic.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Atividade recente</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={postSort === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPostSort('recent')}
              >
                Recentes
              </Button>
              <Button
                variant={postSort === 'popular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPostSort('popular')}
              >
                Populares
              </Button>
            </div>
          </div>

          {feedLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Nenhum post encontrado para este filtro.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map(renderPostCard)}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Minhas comunidades
              </CardTitle>
              <CardDescription>Seus espaços ativos no momento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showInactiveNotice ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Nenhuma comunidade ativa encontrada. Exibindo comunidades inativas.
                </div>
              ) : null}
              {myCommunities.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Você ainda não participa de nenhuma comunidade.
                </div>
              ) : (
                <div className="space-y-4">
                  {myCommunities.map(renderCommunityRow)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comunidades disponíveis</CardTitle>
              <CardDescription>Explore outras comunidades.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableCommunities.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma comunidade disponível.</div>
              ) : (
                <div className="space-y-4">
                  {availableCommunities.map(renderCommunityRow)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maiores contribuidores do mês</CardTitle>
              <CardDescription>Ranking por atividade (posts, comentários e reações).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={leaderboardCommunityId} onValueChange={setLeaderboardCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a comunidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral</SelectItem>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leaderboard.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhuma pontuação registrada ainda.
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div key={entry.userId}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.user?.image || ''} />
                          <AvatarFallback>
                            {(entry.user?.name || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{entry.user?.name || 'Usuário'}</div>
                          <div className="text-xs text-muted-foreground">#{entry.rank}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{entry.score} pts</Badge>
                    </div>
                    {index < leaderboard.length - 1 ? <Separator className="mt-4" /> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
