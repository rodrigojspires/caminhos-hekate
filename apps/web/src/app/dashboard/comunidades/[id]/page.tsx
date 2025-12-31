"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { ArrowLeft, FileText, MessageSquare, Tag, Users } from 'lucide-react'

type Community = {
  id: string
  name: string
  slug: string
  description?: string | null
  accessModels: string[]
  tier: string
  price: number | null
  isActive: boolean
}

type Topic = {
  id: string
  name: string
  slug: string
  color?: string | null
}

type Post = {
  id: string
  title: string
  slug: string
  author: { id: string; name: string; image?: string | null }
  topic?: { id: string; name: string; slug: string; color?: string | null } | null
  _count?: { comments: number; reactions: number }
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

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const communityId = params.id

  const [community, setCommunity] = useState<Community | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [files, setFiles] = useState<CommunityFile[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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
      setTopics(Array.isArray(data.topics) ? data.topics : [])
      setPosts(Array.isArray(data.posts) ? data.posts : [])
      setFiles(Array.isArray(data.files) ? data.files : [])
      setMembers(Array.isArray(data.members) ? data.members : [])
      setMembersCount(typeof data.membersCount === 'number' ? data.membersCount : 0)
      setCanAccess(!!data.canAccess)
      setIsMember(!!data.isMember)
      setMembershipStatus(data.membershipStatus || null)
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
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao se inscrever'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
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
        {!isMember ? (
          <Button onClick={handleEnroll} disabled={actionLoading || !community.isActive}>
            {actionLoading ? 'Processando...' : community.isActive ? 'Participar' : 'Indisponível'}
          </Button>
        ) : membershipStatus === 'pending' ? (
          <Badge variant="secondary">Pendente</Badge>
        ) : (
          <Badge>Inscrito</Badge>
        )}
      </div>

      {!canAccess ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Para visualizar os conteúdos desta comunidade, finalize sua inscrição.
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">
            <Tag className="h-4 w-4 mr-2" />
            Tópicos
          </TabsTrigger>
          <TabsTrigger value="posts">
            <MessageSquare className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-2" />
            Arquivos
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Membros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tópicos da comunidade</CardTitle>
              <CardDescription>Explore os temas principais.</CardDescription>
            </CardHeader>
            <CardContent>
              {!canAccess ? (
                <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
              ) : topics.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum tópico encontrado.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {topics.map((topic) => (
                    <Card key={topic.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{topic.name}</CardTitle>
                        <CardDescription>{topic.slug}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Posts recentes</CardTitle>
              <CardDescription>Atualizações e conversas em destaque.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canAccess ? (
                <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
              ) : posts.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum post encontrado.</div>
              ) : (
                posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{post.title}</CardTitle>
                      <CardDescription>
                        {post.author?.name || 'Usuário'} • {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Arquivos da comunidade</CardTitle>
              <CardDescription>Materiais e documentos compartilhados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Membros</CardTitle>
              <CardDescription>{membersCount} inscritos</CardDescription>
            </CardHeader>
            <CardContent>
              {!canAccess ? (
                <div className="text-sm text-muted-foreground">Conteúdo disponível após inscrição.</div>
              ) : members.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum membro encontrado.</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.image || ''} />
                        <AvatarFallback>
                          {(member.name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name || 'Usuário'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
