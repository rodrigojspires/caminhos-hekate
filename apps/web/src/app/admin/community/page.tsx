'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  MessageSquare, 
  Users, 
  Flag, 
  Hash,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  type LucideIcon
} from 'lucide-react'

interface CommunityStats {
  totalMembers: number
  totalPosts: number
  totalComments: number
  totalTopics: number
  totalLikes: number
  newMembersToday: number
  newPostsToday: number
  newCommentsToday: number
  mostActiveMembers: Array<{
    id: string
    name: string
    avatar?: string
    postsCount: number
    commentsCount: number
  }>
  mostPopularPosts: Array<{
    id: string
    title: string
    author: string
    likesCount: number
    commentsCount: number
    createdAt: string
  }>
  mostActiveTopics: Array<{
    id: string
    name: string
    postsCount: number
    membersCount: number
  }>
  dailyActivity: Array<{
    date: string
    posts: number
    comments: number
    likes: number
  }>
  monthlyGrowth: Array<{
    month: string
    members: number
    posts: number
    engagement: number
  }>
}

export default function CommunityPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/community/stats')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar estatísticas da comunidade')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comunidade</h1>
            <p className="text-muted-foreground">
              Gerencie tópicos, posts, comentários e relatórios da comunidade
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Erro ao carregar estatísticas</p>
            <p className="text-muted-foreground text-center mb-4">
              {error || 'Não foi possível carregar as estatísticas da comunidade.'}
            </p>
            <Button onClick={fetchStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickActions: {
    title: string
    description: string
    href: string
    icon: LucideIcon
    color: string
    badge?: string
  }[] = [
    {
      title: 'Gerenciar Comunidades',
      description: 'Criar e configurar comunidades da plataforma',
      href: '/admin/community/communities',
      icon: Users,
      color: 'bg-indigo-500'
    },
    {
      title: 'Gerenciar Tópicos',
      description: 'Criar, editar e organizar tópicos da comunidade',
      href: '/admin/community/topics',
      icon: Hash,
      color: 'bg-blue-500'
    },
    {
      title: 'Gerenciar Posts',
      description: 'Moderar e gerenciar posts dos usuários',
      href: '/admin/community/posts',
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Gerenciar Comentários',
      description: 'Moderar comentários e respostas',
      href: '/admin/community/comments',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Relatórios',
      description: 'Revisar relatórios de conteúdo inadequado',
      href: '/admin/community/reports',
      icon: Flag,
      color: 'bg-red-500'
    }
  ]

  const statsCards = [
    {
      title: 'Total de Membros',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total de Posts',
      value: stats.totalPosts,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total de Comentários',
      value: stats.totalComments,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total de Tópicos',
      value: stats.totalTopics,
      icon: Hash,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Total de Likes',
      value: stats.totalLikes,
      icon: CheckCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Novos Membros Hoje',
      value: stats.newMembersToday,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunidade</h1>
          <p className="text-muted-foreground">
            Gerencie tópicos, posts, comentários e relatórios da comunidade
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card key={action.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-md ${action.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {action.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild className="w-full">
                    <Link href={action.href}>
                      Acessar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Membros Mais Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Membros Mais Ativos
          </CardTitle>
          <CardDescription>
            Usuários com maior participação na comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.mostActiveMembers?.length || 0) > 0 ? (
              (stats.mostActiveMembers || []).slice(0, 5).map((member, index) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.postsCount} posts • {member.commentsCount} comentários
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro ativo encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts Mais Populares */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Posts Mais Populares
          </CardTitle>
          <CardDescription>
            Posts com maior engajamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.mostPopularPosts?.length || 0) > 0 ? (
              (stats.mostPopularPosts || []).slice(0, 5).map((post) => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      por {post.author} • {post.likesCount} likes • {post.commentsCount} comentários
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum post popular encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tópicos Mais Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Tópicos Mais Ativos
          </CardTitle>
          <CardDescription>
            Tópicos com maior volume de posts e participação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.mostActiveTopics?.length || 0) > 0 ? (
              (stats.mostActiveTopics || []).slice(0, 5).map((topic, index) => (
                <div key={topic.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{topic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.postsCount} posts • {topic.membersCount} membros
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum tópico ativo encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
