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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Flame, MessageCircle, ThumbsUp, TrendingUp, Users } from 'lucide-react'
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
  unreadChatCount?: number
}

type Topic = {
  id: string
  name: string
  slug: string
  color?: string | null
  createdAt: string
  communityId?: string | null
  community?: { id: string; name: string } | null
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
  type: 'CONTENT' | 'THREAD'
  author: { id: string; name: string; image?: string | null }
  topic?: { id: string; name: string; slug: string; color?: string | null } | null
  community?: { id: string; name: string } | null
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
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [leaderboardCommunityId, setLeaderboardCommunityId] = useState<string>('all')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all')
  const [threadTitle, setThreadTitle] = useState('')
  const [threadContent, setThreadContent] = useState('')
  const [threadTopicId, setThreadTopicId] = useState<string>('none')
  const [threadCommunityId, setThreadCommunityId] = useState<string>('none')
  const [threadSubmitting, setThreadSubmitting] = useState(false)
  const [reactionState, setReactionState] = useState<Record<string, boolean>>({})

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
        throw new Error(data?.error || 'Erro ao carregar categorias')
      }
      setTopics(Array.isArray(data.topics) ? data.topics : [])
    } catch (error) {
      toast.error('Erro ao carregar categorias')
    }
  }

  const fetchPosts = async () => {
    try {
      setFeedLoading(true)
      const params = new URLSearchParams({ sort: 'recent', limit: '12' })
      if (selectedTopicId !== 'all') {
        params.set('topicId', selectedTopicId)
      }
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
  }, [selectedTopicId])

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

  const togglePostReaction = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'LIKE' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao reagir')
      }
      setReactionState((prev) => ({ ...prev, [postId]: !!data.liked }))
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post
          const delta = data.liked ? 1 : -1
          const nextCount = Math.max(0, post.reactionsCount + delta)
          return { ...post, reactionsCount: nextCount }
        })
      )
    } catch (error) {
      toast.error('Erro ao reagir ao post')
    }
  }

  const memberCommunityIds = useMemo(() => {
    return new Set(communities.filter((community) => community.isMember).map((community) => community.id))
  }, [communities])

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => post.community?.id && memberCommunityIds.has(post.community.id))
  }, [posts, memberCommunityIds])

  const visibleTopics = useMemo(() => {
    return topics.filter((topic) => topic.community?.id && memberCommunityIds.has(topic.community.id))
  }, [topics, memberCommunityIds])

  const threadTopicOptions = useMemo(() => {
    if (threadCommunityId !== 'none') {
      return visibleTopics.filter((topic) => topic.community?.id === threadCommunityId)
    }
    return visibleTopics
  }, [visibleTopics, threadCommunityId])

  const timelineItems = useMemo(() => {
    return [...visiblePosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [visiblePosts])

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
          {community.unreadChatCount && community.unreadChatCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {community.unreadChatCount} novas
            </Badge>
          ) : null}
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
    const isThread = post.type === 'THREAD'

    return (
      <Card
        key={post.id}
        className={`overflow-hidden border-l-4 ${isThread ? 'border-l-blue-500' : 'border-l-amber-500'}`}
      >
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
                  <Badge variant="outline">{post.type === 'THREAD' ? 'Discussão' : 'Conteúdo'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateLabel}
                  {post.topic?.name ? ` • ${post.topic.name}` : null}
                  {post.community?.name ? ` • ${post.community.name}` : null}
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
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => toggleComments(post.id)}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount} comentários
            </button>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {post.viewCount} visualizações
            </span>
            <button
              type="button"
              className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
                reactionState[post.id] ? 'text-foreground' : ''
              }`}
              onClick={() => togglePostReaction(post.id)}
            >
              <Flame className={`h-4 w-4 ${reactionState[post.id] ? 'text-amber-600' : ''}`} />
              {post.reactionsCount} reações
            </button>
          </div>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar discussão</CardTitle>
              <CardDescription>Crie uma nova thread para conversar com a comunidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Título da discussão"
                value={threadTitle}
                onChange={(event) => setThreadTitle(event.target.value)}
              />
              <Textarea
                placeholder="Compartilhe sua dúvida ou reflexão..."
                value={threadContent}
                onChange={(event) => setThreadContent(event.target.value)}
                rows={4}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={threadCommunityId} onValueChange={setThreadCommunityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Comunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione a comunidade</SelectItem>
                    {myCommunities.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={threadTopicId} onValueChange={setThreadTopicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {threadTopicOptions.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={
                  threadSubmitting ||
                  !threadTitle.trim() ||
                  !threadContent.trim() ||
                  threadCommunityId === 'none'
                }
                onClick={async () => {
                  try {
                    setThreadSubmitting(true)
                    const res = await fetch('/api/community/posts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: threadTitle.trim(),
                        content: threadContent.trim(),
                        communityId: threadCommunityId,
                        topicId: threadTopicId !== 'none' ? threadTopicId : undefined,
                        type: 'THREAD'
                      })
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) {
                      throw new Error(data?.error || 'Erro ao criar discussão')
                    }
                    setThreadTitle('')
                    setThreadContent('')
                    setThreadTopicId('none')
                    setThreadCommunityId('none')
                    await fetchPosts()
                    toast.success('Discussão criada')
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Erro ao criar discussão'
                    toast.error(message)
                  } finally {
                    setThreadSubmitting(false)
                  }
                }}
              >
                {threadSubmitting ? 'Publicando...' : 'Publicar discussão'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Linha do tempo</h2>
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {visibleTopics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          ) : timelineItems.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Nenhum conteúdo das suas comunidades.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {timelineItems.map(renderPostCard)}
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
                  {myCommunities.map((community) => (
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
