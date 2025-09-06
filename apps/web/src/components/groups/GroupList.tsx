'use client'

import { useState, useEffect, useCallback } from 'react'
import { GroupCard } from './GroupCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { 
  Search, 
  Plus, 
  Filter,
  Users,
  Lock,
  Globe,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { toast } from 'sonner'

interface GroupMember {
  id: string
  role: string
  user: {
    id: string
    name: string
    image?: string
  }
}

interface Group {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPrivate: boolean
  memberCount: number
  messageCount: number
  maxMembers?: number
  lastActivityAt: Date
  createdAt: Date
  members?: GroupMember[]
  userRole?: string
}

interface GroupListProps {
  currentUserId?: string
  onCreateGroup?: () => void
  onJoinGroup?: (groupId: string) => Promise<void>
  onLeaveGroup?: (groupId: string) => Promise<void>
  onManageGroup?: (groupId: string) => void
  className?: string
}

type SortOption = 'name' | 'members' | 'activity' | 'created'
type SortDirection = 'asc' | 'desc'
type FilterTab = 'all' | 'my-groups' | 'public' | 'private'

export function GroupList({
  currentUserId,
  onCreateGroup,
  onJoinGroup,
  onLeaveGroup,
  onManageGroup,
  className = ''
}: GroupListProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('activity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch groups
  const fetchGroups = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setIsLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        sort: sortBy,
        direction: sortDirection
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (activeTab !== 'all') {
        if (activeTab === 'my-groups') {
          params.append('member', 'true')
        } else if (activeTab === 'public') {
          params.append('privacy', 'public')
        } else if (activeTab === 'private') {
          params.append('privacy', 'private')
        }
      }

      const response = await fetch(`/api/groups?${params}`)
      const data = await response.json()

      if (data.success) {
        const newGroups = data.data.groups.map((group: any) => ({
          ...group,
          lastActivityAt: new Date(group.lastActivityAt),
          createdAt: new Date(group.createdAt)
        }))

        if (append) {
          setGroups(prev => [...prev, ...newGroups])
        } else {
          setGroups(newGroups)
        }

        setHasMore(data.data.pagination.hasMore)
      } else {
        toast.error(data.error || 'Erro ao carregar grupos')
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast.error('Erro ao carregar grupos')
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [sortBy, sortDirection, searchTerm, activeTab])

  // Filter and sort groups locally
  useEffect(() => {
    let filtered = [...groups]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'members':
          comparison = a.memberCount - b.memberCount
          break
        case 'activity':
          comparison = new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime()
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    setFilteredGroups(filtered)
  }, [groups, searchTerm, sortBy, sortDirection])

  // Load initial data
  useEffect(() => {
    setPage(1)
    fetchGroups(1, false)
  }, [fetchGroups])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchGroups(1, false)
    }, 500)

    return () => clearTimeout(timer)
  }, [fetchGroups])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchGroups(nextPage, true)
  }

  const handleJoinGroup = async (groupId: string) => {
    if (!onJoinGroup) return
    
    try {
      await onJoinGroup(groupId)
      // Refresh the group data
      fetchGroups(1, false)
      toast.success('Você entrou no grupo com sucesso!')
    } catch (error) {
      toast.error('Erro ao entrar no grupo')
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!onLeaveGroup) return
    
    try {
      await onLeaveGroup(groupId)
      // Refresh the group data
      fetchGroups(1, false)
      toast.success('Você saiu do grupo')
    } catch (error) {
      toast.error('Erro ao sair do grupo')
    }
  }

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(option)
      setSortDirection('desc')
    }
  }

  const getTabCount = (tab: FilterTab) => {
    switch (tab) {
      case 'my-groups':
        return groups.filter(g => g.userRole).length
      case 'public':
        return groups.filter(g => !g.isPrivate).length
      case 'private':
        return groups.filter(g => g.isPrivate).length
      default:
        return groups.length
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Grupos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Conecte-se com outros praticantes em grupos privados
          </p>
        </div>
        
        {onCreateGroup && (
          <Button onClick={onCreateGroup} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Criar Grupo
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Última Atividade</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="members">Membros</SelectItem>
              <SelectItem value="created">Data de Criação</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as FilterTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Todos
              <Badge variant="secondary" className="ml-1">
                {getTabCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="my-groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Meus Grupos
              <Badge variant="secondary" className="ml-1">
                {getTabCount('my-groups')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Públicos
              <Badge variant="secondary" className="ml-1">
                {getTabCount('public')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Privados
              <Badge variant="secondary" className="ml-1">
                {getTabCount('private')}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo disponível'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm 
              ? 'Tente ajustar os filtros de busca'
              : 'Seja o primeiro a criar um grupo!'
            }
          </p>
          {onCreateGroup && !searchTerm && (
            <Button onClick={onCreateGroup}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Grupo
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                currentUserId={currentUserId}
                onJoinGroup={handleJoinGroup}
                onLeaveGroup={handleLeaveGroup}
                onManageGroup={onManageGroup}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Carregar Mais'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}