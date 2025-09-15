'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Users, 
  Calendar, 
  MessageCircle, 
  Shield, 
  Globe, 
  MapPin,
  Clock,
  Star,
  UserPlus,
  ArrowLeft,
  Settings,
  Share2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface GroupDetails {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPrivate: boolean
  category?: string
  maxMembers?: number
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string
    image?: string
  }
  _count: {
    members: number
    messages: number
    events: number
  }
  members: Array<{
    id: string
    role: string
    joinedAt: string
    user: {
      id: string
      name: string
      image?: string
    }
  }>
  recentEvents: Array<{
    id: string
    title: string
    description?: string
    startDate: string
    endDate?: string
    location?: string
    type: string
    _count: {
      attendees: number
    }
  }>
  isMember?: boolean
  memberRole?: string
  canJoin?: boolean
}

export default function GroupDetailsPage() {
  const params = useParams()
  const groupId = params?.id as string
  const router = useRouter()
  const { data: session } = useSession()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchGroupDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/groups/${groupId}/public`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar grupo')
      }
      setGroup(data.data)
    } catch (error: any) {
      console.error('Erro ao carregar grupo:', error)
      setError(error.message || 'Erro ao carregar grupo')
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails()
    }
  }, [groupId, fetchGroupDetails])

  const handleJoinGroup = async () => {
    if (!session?.user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    try {
      setIsJoining(true)
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao entrar no grupo')
      }

      toast.success(data.message || 'Você entrou no grupo com sucesso!')
      
      // Redirecionar para o grupo no dashboard
      router.push(`/dashboard/grupos/${groupId}`)
    } catch (error: any) {
      console.error('Erro ao entrar no grupo:', error)
      toast.error(error.message || 'Erro ao entrar no grupo')
    } finally {
      setIsJoining(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: group?.name,
          text: group?.description,
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado para a área de transferência!')
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Proprietário'
      case 'ADMIN': return 'Administrador'
      case 'MODERATOR': return 'Moderador'
      case 'MEMBER': return 'Membro'
      default: return role
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'
      case 'ADMIN': return 'destructive'
      case 'MODERATOR': return 'secondary'
      case 'MEMBER': return 'outline'
      default: return 'outline'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'MEETING': return 'Reunião'
      case 'WORKSHOP': return 'Workshop'
      case 'SOCIAL': return 'Social'
      case 'STUDY': return 'Estudo'
      case 'OTHER': return 'Outro'
      default: return type
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Carregando grupo...</p>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Grupo não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {error || 'Este grupo não existe ou não está disponível.'}
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/grupos">Explorar Grupos</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">Voltar à Minha Escola</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/grupos">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Grupos
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              {group.isMember && (
                <Button asChild>
                  <Link href={`/dashboard/grupos/${group.id}`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gerenciar
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {group.imageUrl ? (
                    <Image
                      src={group.imageUrl}
                      alt={group.name}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          {group.name}
                        </h1>
                        <div className="flex items-center space-x-2 mb-3">
                          {group.isPrivate ? (
                            <Badge variant="secondary">
                              <Shield className="w-3 h-3 mr-1" />
                              Privado
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Globe className="w-3 h-3 mr-1" />
                              Público
                            </Badge>
                          )}
                          {group.category && (
                            <Badge variant="outline">
                              {group.category}
                            </Badge>
                          )}
                          {group.isMember && (
                            <Badge variant="default">
                              <Star className="w-3 h-3 mr-1" />
                              Membro
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {group.description && (
                      <p className="text-gray-600 mb-4">{group.description}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {group._count.members} {group._count.members === 1 ? 'membro' : 'membros'}
                        {group.maxMembers && ` / ${group.maxMembers}`}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {group._count.messages} mensagens
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {group._count.events} eventos
                      </div>
                    </div>

                    {/* Join Button */}
                    {!group.isMember && group.canJoin && (
                      <div className="mt-4">
                        <Button 
                          onClick={handleJoinGroup}
                          disabled={isJoining}
                          size="lg"
                          className="w-full sm:w-auto"
                        >
                          {isJoining ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Entrando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Entrar no Grupo
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">Sobre</TabsTrigger>
                <TabsTrigger value="members">Membros</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sobre o Grupo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.description ? (
                      <p className="text-gray-600">{group.description}</p>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma descrição disponível.</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Criado por</h4>
                        <div className="flex items-center space-x-2">
                          {group.creator.image ? (
                            <Image
                              src={group.creator.image}
                              alt={group.creator.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <span className="text-gray-600">{group.creator.name}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Criado em</h4>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {new Date(group.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Membros ({group._count.members})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.members.slice(0, 10).map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {member.user.image ? (
                              <Image
                                src={member.user.image}
                                alt={member.user.name}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{member.user.name}</p>
                              <p className="text-sm text-gray-500">
                                Membro desde {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      ))}
                      {group.members.length > 10 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          E mais {group.members.length - 10} membros...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Eventos Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.recentEvents.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Nenhum evento encontrado.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {group.recentEvents.map((event) => (
                          <div key={event.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {event.title}
                                </h4>
                                {event.description && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(event.startDate).toLocaleDateString('pt-BR')}
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-1" />
                                      {event.location}
                                    </div>
                                  )}
                                  <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    {event._count.attendees} participantes
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline">
                                {getEventTypeLabel(event.type)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.isMember ? (
                  <>
                    <Button asChild className="w-full">
                      <Link href={`/dashboard/grupos/${group.id}`}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Ir para o Chat
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/dashboard/grupos/${group.id}?tab=events`}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Ver Eventos
                      </Link>
                    </Button>
                  </>
                ) : group.canJoin ? (
                  <Button 
                    onClick={handleJoinGroup}
                    disabled={isJoining}
                    className="w-full"
                  >
                    {isJoining ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Entrar no Grupo
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500 text-center">
                    Este grupo não está aceitando novos membros no momento.
                  </p>
                )}
                
                <Button variant="outline" onClick={handleShare} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar Grupo
                </Button>
              </CardContent>
            </Card>

            {/* Group Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Membros</span>
                  <span className="font-medium">{group._count.members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mensagens</span>
                  <span className="font-medium">{group._count.messages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Eventos</span>
                  <span className="font-medium">{group._count.events}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Criado em</span>
                  <span className="font-medium">
                    {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
