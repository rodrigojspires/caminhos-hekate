'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, Users, MessageCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GroupList } from './GroupList'
import { CreateGroupModal } from './CreateGroupModal'
import { GroupInviteModal } from './GroupInviteModal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

interface GroupStats {
  totalGroups: number
  myGroups: number
  totalMembers: number
  totalMessages: number
  totalEvents: number
}

export function GroupsPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-groups')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats()
    }
  }, [session?.user?.id])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/groups/stats')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas dos grupos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGroup = async (groupData: any) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar grupo')
      }

      const newGroup = await response.json()
      toast.success('Grupo criado com sucesso!')
      setIsCreateModalOpen(false)
      fetchStats() // Refresh stats
      return newGroup
    } catch (error: any) {
      console.error('Erro ao criar grupo:', error)
      toast.error(error.message || 'Erro ao criar grupo')
      throw error
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session?.user?.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao entrar no grupo')
      }

      toast.success('Você entrou no grupo!')
      fetchStats() // Refresh stats
    } catch (error: any) {
      console.error('Erro ao entrar no grupo:', error)
      toast.error(error.message || 'Erro ao entrar no grupo')
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session?.user?.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao sair do grupo')
      }

      toast.success('Você saiu do grupo')
      fetchStats() // Refresh stats
    } catch (error: any) {
      console.error('Erro ao sair do grupo:', error)
      toast.error(error.message || 'Erro ao sair do grupo')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-600 mt-1">
            Participe de comunidades privadas e conecte-se com outros membros
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsInviteModalOpen(true)}
          >
            Entrar com Convite
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Grupo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meus Grupos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar grupos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Groups Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-groups">Meus Grupos</TabsTrigger>
          <TabsTrigger value="discover">Descobrir</TabsTrigger>
          <TabsTrigger value="invitations">Convites</TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups" className="space-y-4">
          <GroupList
            currentUserId={session?.user?.id || ''}
            onCreateGroup={() => setIsCreateModalOpen(true)}
            onJoinGroup={handleJoinGroup}
            onLeaveGroup={handleLeaveGroup}
            onManageGroup={(groupId) => window.location.href = `/dashboard/grupos/${groupId}`}
          />
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <GroupList
            currentUserId={session?.user?.id || ''}
            onCreateGroup={() => setIsCreateModalOpen(true)}
            onJoinGroup={handleJoinGroup}
            onLeaveGroup={handleLeaveGroup}
            onManageGroup={(groupId) => window.location.href = `/dashboard/grupos/${groupId}`}
          />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <GroupList
            currentUserId={session?.user?.id || ''}
            onCreateGroup={() => setIsCreateModalOpen(true)}
            onJoinGroup={handleJoinGroup}
            onLeaveGroup={handleLeaveGroup}
            onManageGroup={(groupId) => window.location.href = `/dashboard/grupos/${groupId}`}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateGroupModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onGroupCreated={handleCreateGroup}
      />

      <GroupInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        groupId=""
        groupName=""
        currentUserRole="MEMBER"
      />
    </div>
  )
}