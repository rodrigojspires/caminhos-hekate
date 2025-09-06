'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Users, MessageCircle, Calendar, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GroupChat } from '@/components/groups/GroupChat'
import { GroupMembersList } from '@/components/groups/GroupMembersList'
import { GroupEvents } from '@/components/groups/GroupEvents'
import { GroupSettings } from '@/components/groups/GroupSettings'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Group {
  id: string
  name: string
  description: string
  type: 'PUBLIC' | 'PRIVATE'
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  maxMembers: number
  imageUrl?: string
  settings: {
    allowMemberInvites: boolean
    requireApproval: boolean
    allowFileSharing: boolean
    allowEventCreation: boolean
  }
  createdAt: string
  updatedAt: string
  ownerId: string
  owner: {
    id: string
    name: string
    email: string
    image?: string
  }
  _count: {
    members: number
    messages: number
    events: number
  }
  userRole?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
}

export default function GroupPage() {
  const params = useParams()
  const groupId = params?.id as string
  const router = useRouter()
  const { data: session } = useSession()
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')

  const fetchGroup = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/groups/${groupId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Grupo não encontrado')
          router.push('/dashboard/grupos')
          return
        }
        if (response.status === 403) {
          toast.error('Você não tem permissão para acessar este grupo')
          router.push('/dashboard/grupos')
          return
        }
        throw new Error('Erro ao carregar grupo')
      }

      const data = await response.json()
      setGroup(data)
    } catch (error) {
      console.error('Erro ao carregar grupo:', error)
      toast.error('Erro ao carregar grupo')
    } finally {
      setIsLoading(false)
    }
  }, [groupId, router])

  useEffect(() => {
    if (groupId && session?.user?.id) {
      fetchGroup()
    }
  }, [groupId, session?.user?.id, fetchGroup])

  const handleLeaveGroup = async () => {
    if (!group || !session?.user?.id) return

    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session.user.id }),
      })

      if (!response.ok) {
        throw new Error('Erro ao sair do grupo')
      }

      toast.success('Você saiu do grupo')
      router.push('/dashboard/grupos')
    } catch (error) {
      console.error('Erro ao sair do grupo:', error)
      toast.error('Erro ao sair do grupo')
    }
  }

  const canManageGroup = group?.userRole === 'OWNER' || group?.userRole === 'ADMIN'
  const canModerate = canManageGroup || group?.userRole === 'MODERATOR'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grupo não encontrado</h2>
        <p className="text-gray-600 mb-4">O grupo que você está procurando não existe ou foi removido.</p>
        <Button onClick={() => router.push('/dashboard/grupos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Grupos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/grupos')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Grupos
        </Button>
      </div>

      {/* Group Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={group.imageUrl} alt={group.name} />
                <AvatarFallback className="text-lg">
                  {group.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <CardTitle className="text-2xl">{group.name}</CardTitle>
                  <Badge variant={group.type === 'PRIVATE' ? 'secondary' : 'default'}>
                    {group.type === 'PRIVATE' ? 'Privado' : 'Público'}
                  </Badge>
                  <Badge variant={group.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {group.status === 'ACTIVE' ? 'Ativo' : group.status === 'INACTIVE' ? 'Inativo' : 'Arquivado'}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-2">{group.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {group._count.members} membros
                  </span>
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {group._count.messages} mensagens
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {group._count.events} eventos
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              {canManageGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
              )}
              {group.userRole !== 'OWNER' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveGroup}
                >
                  Sair do Grupo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          {canManageGroup && <TabsTrigger value="settings">Configurações</TabsTrigger>}
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          {group && (
            <GroupChat
              groupId={group.id}
              userRole={group.userRole ?? 'MEMBER'}
            />
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {group && (
            <GroupMembersList
              groupId={group.id}
              currentUserId={session?.user?.id || ''}
              currentUserRole={group.userRole ?? 'MEMBER'}
            />
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {group && (
            <GroupEvents
              groupId={group.id}
              currentUserId={session?.user?.id || ''}
              canCreateEvents={canModerate}
            />
          )}
        </TabsContent>

        {canManageGroup && (
          <TabsContent value="settings" className="space-y-4">
            {group && (
              <GroupSettings
                group={group}
                onUpdate={fetchGroup}
                canDelete={group.userRole === 'OWNER'}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}