"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { ArrowLeft, FileText, Flame, MessageCircle, MessageSquare, ThumbsUp, TrendingUp, Users } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import NestedComments from '@/components/public/community/NestedComments'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { PlanSelector } from '@/components/payments/PlanSelector'
import { PaymentForm } from '@/components/payments/PaymentForm'

type Community = {
  id: string
  name: string
  slug: string
  description?: string | null
  accessModels: string[]
  tier: string
  price: number | null
  isActive: boolean
  allowedByTier?: boolean
}

type Post = {
  id: string
  title: string
  slug: string
  author: { id: string; name: string; image?: string | null }
  topic?: { id: string; name: string; slug: string; color?: string | null } | null
  community?: { id: string; name: string } | null
  content?: string | null
  excerpt?: string | null
  viewCount: number
  commentsCount: number
  reactionsCount: number
  isPinned?: boolean | null
  locked?: boolean | null
  tier?: string | null
  type?: 'THREAD' | 'CONTENT' | null
  createdAt: string
}

type CommunityFile = {
  id: string
  title: string
  description?: string | null
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  createdAt: string
}

type Member = {
  id: string
  name?: string | null
  image?: string | null
}

type ChatMessage = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name?: string | null; image?: string | null }
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const communityId = params.id

  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [files, setFiles] = useState<CommunityFile[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [canAccess, setCanAccess] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
  const [membershipPaidUntil, setMembershipPaidUntil] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [sidebarSection, setSidebarSection] = useState<'chat' | 'files' | 'members'>('chat')
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [reactionState, setReactionState] = useState<Record<string, boolean>>({})
  const [discussionOpen, setDiscussionOpen] = useState(false)
  const [discussionTitle, setDiscussionTitle] = useState('')
  const [discussionContent, setDiscussionContent] = useState('')
  const [discussionSubmitting, setDiscussionSubmitting] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState<any | null>(null)
  const [upgradeBilling, setUpgradeBilling] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatLastReadAt, setChatLastReadAt] = useState<string | null>(null)
  const [onlineMemberIds, setOnlineMemberIds] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const accessLabel = useMemo(() => {
    if (!community) return ''
    const labels = []
    if (community.accessModels.includes('FREE')) labels.push('Gratuita')
    if (community.accessModels.includes('SUBSCRIPTION')) labels.push(`Assinatura ${community.tier}`)
    if (community.accessModels.includes('ONE_TIME')) labels.push('Compra avulsa')
    return labels.join(' • ')
  }, [community])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/communities/${communityId}/overview`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar comunidade')
      }
      setCommunity(data.community)
      setFiles(Array.isArray(data.files) ? data.files : [])
      setMembers(Array.isArray(data.members) ? data.members : [])
      setMembersCount(typeof data.membersCount === 'number' ? data.membersCount : 0)
      setCanAccess(!!data.canAccess)
      setIsMember(!!data.isMember)
      setMembershipStatus(data.membershipStatus || null)
      setMembershipPaidUntil(data.membershipPaidUntil || null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar comunidade'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (communityId) loadData()
  }, [communityId])

  const fetchPosts = async () => {
    if (!communityId) return
    try {
      setPostsLoading(true)
      const res = await fetch(`/api/community/posts?communityId=${communityId}&limit=20`, {
        cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar posts')
      }
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar posts'
      toast.error(message)
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    if (communityId) {
      fetchPosts()
    }
  }, [communityId])

  useEffect(() => {
    if (sidebarSection === 'chat' && canAccess) {
      loadChat()
    }
  }, [sidebarSection, canAccess])

  useEffect(() => {
    if (!canAccess || !communityId) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    let canceled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let reconnectAttempts = 0

    const scheduleReconnect = () => {
      if (canceled) return
      const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts)
      reconnectAttempts += 1
      reconnectTimer = window.setTimeout(() => {
        connect()
      }, delay)
    }

    const connect = async () => {
      try {
        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }

        const res = await fetch('/api/communities/ws/token', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao autenticar chat')
        }

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        const socket = new WebSocket(`${protocol}://${host}/communities-ws`)
        wsRef.current = socket

        socket.onopen = () => {
          reconnectAttempts = 0
          socket.send(JSON.stringify({ type: 'authenticate', token: data.token }))
          if (pingTimer) {
            window.clearInterval(pingTimer)
          }
          pingTimer = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'ping' }))
            }
          }, 25000)
        }

        socket.onmessage = async (event) => {
          if (canceled) return
          const payload = JSON.parse(event.data)
          if (payload.type === 'authenticated') {
            socket.send(JSON.stringify({ type: 'join_community', communityId }))
          }
          if (payload.type === 'presence' && payload.communityId === communityId) {
            setOnlineMemberIds(Array.isArray(payload.userIds) ? payload.userIds : [])
          }
          if (payload.type === 'new_message' && payload.message) {
            setChatMessages((prev) => {
              if (prev.some((msg) => msg.id === payload.message.id)) {
                return prev
              }
              return [...prev, payload.message]
            })
            await fetch(`/api/communities/${communityId}/chat/read`, { method: 'POST' })
          }
        }

        socket.onclose = () => {
          if (pingTimer) {
            window.clearInterval(pingTimer)
            pingTimer = null
          }
          if (wsRef.current === socket) {
            wsRef.current = null
          }
          scheduleReconnect()
        }

        socket.onerror = () => {
          socket.close()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao conectar chat'
        toast.error(message)
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      canceled = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      if (pingTimer) {
        window.clearInterval(pingTimer)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [canAccess, communityId])

  const handleEnroll = async () => {
    if (!communityId) return
    try {
      setActionLoading(true)
      const res = await fetch(`/api/communities/${communityId}/membership`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao se inscrever')
      }
      toast.success(data.status === 'active' ? 'Inscrição confirmada' : 'Inscrição pendente')
      if (data.status === 'pending' && community) {
        const accessModels = community.accessModels || []
        if (accessModels.includes('ONE_TIME')) {
          router.push(`/checkout?communityId=${community.id}`)
          return
        }
        if (accessModels.includes('SUBSCRIPTION') && community.allowedByTier === false) {
          setUpgradeOpen(true)
        }
      }
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao se inscrever'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  const cancelMembership = async () => {
    if (!communityId) return
    try {
      setActionLoading(true)
      const res = await fetch(`/api/communities/${communityId}/membership`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao cancelar inscrição')
      }
      if (data?.paidUntil) {
        const until = new Date(data.paidUntil).toLocaleDateString('pt-BR')
        toast.success(`Cancelamento agendado. Acesso até ${until}.`)
      } else {
        toast.success('Inscrição cancelada')
      }
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao cancelar inscrição'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  const loadChat = async () => {
    if (!communityId) return
    try {
      setChatLoading(true)
      const res = await fetch(`/api/communities/${communityId}/chat/messages?limit=50`, {
        cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar chat')
      }
      const list = Array.isArray(data.messages) ? data.messages : []
      setChatMessages(list.reverse())
      setChatLastReadAt(data.lastReadAt || null)
      await fetch(`/api/communities/${communityId}/chat/read`, { method: 'POST' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar chat'
      toast.error(message)
    } finally {
      setChatLoading(false)
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
          const nextCount = Math.max(0, (post.reactionsCount || 0) + delta)
          return { ...post, reactionsCount: nextCount }
        })
      )
    } catch (error) {
      toast.error('Erro ao reagir ao post')
    }
  }

  const onlineSet = useMemo(() => new Set(onlineMemberIds), [onlineMemberIds])

  const firstUnreadMessageId = useMemo(() => {
    if (!chatLastReadAt) return null
    const lastReadTime = new Date(chatLastReadAt).getTime()
    const found = chatMessages.find((message) => new Date(message.createdAt).getTime() > lastReadTime)
    return found?.id || null
  }, [chatMessages, chatLastReadAt])

  useEffect(() => {
    if (sidebarSection !== 'chat') return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, sidebarSection])

  const sendChat = async () => {
    if (!communityId || !chatText.trim()) return
    try {
      setChatLoading(true)
      const socket = wsRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'send_message', content: chatText.trim() }))
        setChatText('')
      } else {
        const res = await fetch(`/api/communities/${communityId}/chat/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: chatText.trim() })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao enviar mensagem')
        }
        setChatText('')
        await loadChat()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem'
      toast.error(message)
    } finally {
      setChatLoading(false)
    }
  }

  const submitDiscussion = async () => {
    if (!communityId || !discussionTitle.trim() || !discussionContent.trim()) return
    try {
      setDiscussionSubmitting(true)
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: discussionTitle.trim(),
          content: discussionContent.trim(),
          communityId,
          type: 'THREAD'
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao criar discussão')
      }
      setDiscussionTitle('')
      setDiscussionContent('')
      setDiscussionOpen(false)
      await fetchPosts()
      toast.success('Discussão criada')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar discussão'
      toast.error(message)
    } finally {
      setDiscussionSubmitting(false)
    }
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendChat()
    }
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
          {isOpen ? <NestedComments postId={post.id} locked={!!post.locked} /> : null}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Comunidade não encontrada.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/comunidades">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{community.name}</h1>
          <p className="text-muted-foreground">{community.description || 'Sem descrição cadastrada.'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{accessLabel || 'Sem modelo de acesso definido'}</span>
            {community.price != null ? <span>• R$ {community.price.toFixed(2)}</span> : null}
            {!community.isActive ? <Badge variant="secondary">Inativa</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isMember ? (
            <Button onClick={handleEnroll} disabled={actionLoading || !community.isActive}>
              {actionLoading ? 'Processando...' : community.isActive ? 'Participar' : 'Indisponível'}
            </Button>
          ) : membershipStatus === 'pending' ? (
            <>
              <Badge variant="secondary">Pendente</Badge>
              <Button variant="outline" onClick={cancelMembership} disabled={actionLoading}>
                Cancelar inscrição
              </Button>
              {community.accessModels.includes('ONE_TIME') ? (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/checkout?communityId=${community.id}`)}
                  disabled={actionLoading}
                >
                  Ir para o checkout
                </Button>
              ) : null}
            </>
          ) : membershipStatus === 'cancelled' ? (
            <Badge variant="secondary">Cancelamento agendado</Badge>
          ) : (
            <>
              <Badge>Inscrito</Badge>
              {community.accessModels.includes('ONE_TIME') ? (
                <Button variant="outline" onClick={cancelMembership} disabled={actionLoading}>
                  Cancelar renovação
                </Button>
              ) : null}
            </>
          )}
          {!canAccess && membershipStatus !== 'pending' && community.accessModels.includes('SUBSCRIPTION') ? (
            <Button variant="outline" onClick={() => setUpgradeOpen(true)} disabled={actionLoading}>
              Ver planos
            </Button>
          ) : null}
          {!canAccess && membershipStatus !== 'pending' && community.accessModels.includes('ONE_TIME') ? (
            <Button variant="outline" onClick={() => router.push(`/checkout?communityId=${community.id}`)} disabled={actionLoading}>
              Ir para o checkout
            </Button>
          ) : null}
        </div>
      </div>

      {membershipPaidUntil ? (
        <div className="text-xs text-muted-foreground">
          Acesso válido até {new Date(membershipPaidUntil).toLocaleDateString('pt-BR')}
        </div>
      ) : null}

      {!canAccess ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Para visualizar os conteúdos desta comunidade, finalize sua inscrição.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Posts da comunidade</h2>
            <Button
              onClick={() => setDiscussionOpen(true)}
              disabled={!canAccess}
            >
              Nova discussão
            </Button>
          </div>

          {!canAccess ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Conteúdo disponível após inscrição.
              </CardContent>
            </Card>
          ) : postsLoading ? (
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
                Nenhum post encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map(renderPostCard)}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:h-[calc(100vh-140px)]">
          <Card className="shrink-0">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant={sidebarSection === 'chat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSidebarSection('chat')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button
                  variant={sidebarSection === 'files' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSidebarSection('files')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Arquivos
                </Button>
                <Button
                  variant={sidebarSection === 'members' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSidebarSection('members')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Membros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col">
            {sidebarSection === 'chat' ? (
              <>
                <CardHeader className="pb-3">
                  <CardTitle>Chat da comunidade</CardTitle>
                  <CardDescription>Converse em tempo real com outros membros.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  {!canAccess ? (
                    <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-3 rounded-md border p-3">
                        {chatLoading && chatMessages.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
                        ) : chatMessages.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>
                        ) : (
                          chatMessages.map((message) => (
                            <div key={message.id}>
                              {firstUnreadMessageId === message.id ? (
                                <div className="flex items-center gap-2 text-xs text-amber-700">
                                  <span className="h-px flex-1 bg-amber-200" />
                                  Novas mensagens
                                  <span className="h-px flex-1 bg-amber-200" />
                                </div>
                              ) : null}
                              <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={message.author.image || ''} />
                                  <AvatarFallback>
                                    {(message.author.name || 'U').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    {message.author.name || 'Usuário'} •{' '}
                                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          value={chatText}
                          onChange={(event) => setChatText(event.target.value)}
                          onKeyDown={handleChatKeyDown}
                          placeholder="Escreva sua mensagem..."
                          rows={3}
                        />
                        <Button onClick={sendChat} disabled={chatLoading || !chatText.trim()}>
                          Enviar mensagem
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </>
            ) : sidebarSection === 'files' ? (
              <>
                <CardHeader className="pb-3">
                  <CardTitle>Arquivos da comunidade</CardTitle>
                  <CardDescription>Materiais e documentos compartilhados.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 overflow-y-auto">
                  {!canAccess ? (
                    <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
                  ) : files.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum arquivo cadastrado.</div>
                  ) : (
                    files.map((file) => (
                      <Card key={file.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{file.title}</CardTitle>
                          <CardDescription>{file.description || 'Sem descrição'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild variant="outline" size="sm">
                            <a href={file.fileUrl} target="_blank" rel="noreferrer">Abrir arquivo</a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="pb-3">
                  <CardTitle>Membros</CardTitle>
                  <CardDescription>{membersCount} inscritos</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 overflow-y-auto">
                  {!canAccess ? (
                    <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
                  ) : members.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum membro encontrado.</div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.image || ''} />
                              <AvatarFallback>
                                {(member.name || 'U').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.name || 'Usuário'}</span>
                          </div>
                          {onlineSet.has(member.id) ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              online
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">offline</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </aside>
      </div>

      <Dialog open={discussionOpen} onOpenChange={setDiscussionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova discussão</DialogTitle>
            <DialogDescription>Inicie um tópico para conversar com a comunidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título da discussão"
              value={discussionTitle}
              onChange={(event) => setDiscussionTitle(event.target.value)}
            />
            <Textarea
              placeholder="Compartilhe sua dúvida ou reflexão..."
              value={discussionContent}
              onChange={(event) => setDiscussionContent(event.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submitDiscussion}
              disabled={
                discussionSubmitting ||
                !discussionTitle.trim() ||
                !discussionContent.trim() ||
                !canAccess
              }
            >
              {discussionSubmitting ? 'Publicando...' : 'Publicar discussão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade de plano</DialogTitle>
            <DialogDescription>Escolha um plano para acessar esta comunidade.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={upgradeBilling === 'MONTHLY' ? 'default' : 'outline'}
              onClick={() => setUpgradeBilling('MONTHLY')}
            >
              Mensal
            </Button>
            <Button
              variant={upgradeBilling === 'YEARLY' ? 'default' : 'outline'}
              onClick={() => setUpgradeBilling('YEARLY')}
            >
              Anual
            </Button>
          </div>
          <PlanSelector
            billing={upgradeBilling}
            onPlanSelect={(plan) => setUpgradePlan(plan)}
            selectedPlanId={upgradePlan?.id}
            columns={4}
          />
          {upgradePlan ? (
            <Card>
              <CardHeader>
                <CardTitle>Assinar {upgradePlan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  plan={upgradePlan}
                  onPaymentSuccess={() => {
                    setUpgradeOpen(false)
                    setUpgradePlan(null)
                    loadData()
                  }}
                  onCancel={() => setUpgradePlan(null)}
                />
              </CardContent>
            </Card>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
