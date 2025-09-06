'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Shield, 
  Globe, 
  Calendar,
  MessageCircle,
  TrendingUp,
  Star
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'

interface Group {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPrivate: boolean
  category?: string
  maxMembers?: number
  createdAt: string
  _count: {
    members: number
    messages: number
    events: number
  }
  creator: {
    id: string
    name: string
    image?: string
  }
  isMember?: boolean
  memberRole?: string
}

interface GroupStats {
  totalGroups: number
  publicGroups: number
  privateGroups: number
  totalMembers: number
  activeGroups: number
}

export default function PublicGroupsPage() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isJoining, setIsJoining] = useState<string | null>(null)

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'study', label: 'Estudos' },
    { value: 'hobby', label: 'Hobbies' },
    { value: 'professional', label: 'Profissional' },
    { value: 'community', label: 'Comunidade' },
    { value: 'sports', label: 'Esportes' },
    { value: 'arts', label: 'Artes' },
    { value: 'technology', label: 'Tecnologia' },
    { value: 'other', label: 'Outros' }
  ]

  const sortOptions = [
    { value: 'newest', label: 'Mais Recentes' },
    { value: 'oldest', label: 'Mais Antigos' },
    { value: 'members', label: 'Mais Membros' },
    { value: 'active', label: 'Mais Ativos' },
    { value: 'name', label: 'Nome A-Z' }
  ]

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        search: searchTerm,
        category: selectedCategory,
        sortBy: sortBy,
        publicOnly: 'true'
      })

      const response = await fetch(`/api/groups?${params}`)
      const data = await response.json()

      if (response.ok) {
        setGroups(data.data || [])
      } else {
        toast.error(data.error || 'Erro ao carregar grupos')
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
      toast.error('Erro ao carregar grupos')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedCategory, sortBy])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/groups/public-stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
    fetchStats()
  }, [searchTerm, selectedCategory, sortBy, fetchGroups, fetchStats])

  const handleJoinGroup = async (groupId: string) => {
    if (!session?.user) {
      toast.error('Você precisa estar logado para entrar em um grupo')
      return
    }

    try {
      setIsJoining(groupId)
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Você entrou no grupo com sucesso!')
        fetchGroups() // Refresh the list
      } else {
        toast.error(data.error || 'Erro ao entrar no grupo')
      }
    } catch (error) {
      console.error('Erro ao entrar no grupo:', error)
      toast.error('Erro ao entrar no grupo')
    } finally {
      setIsJoining(null)
    }
  }

  const getCategoryLabel = (category?: string) => {
    const cat = categories.find(c => c.value === category)
    return cat?.label || 'Outros'
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = !searchTerm || 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || group.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              Descubra Grupos Incríveis
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Conecte-se com pessoas que compartilham seus interesses e paixões
            </p>
            
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalGroups}</div>
                  <div className="text-sm text-blue-100">Grupos Totais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.publicGroups}</div>
                  <div className="text-sm text-blue-100">Grupos Públicos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalMembers}</div>
                  <div className="text-sm text-blue-100">Membros Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.activeGroups}</div>
                  <div className="text-sm text-blue-100">Grupos Ativos</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar grupos por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Group Button */}
            {session?.user && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo
              </Button>
            )}
          </div>
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Carregando grupos...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum grupo encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Tente ajustar seus filtros de busca'
                : 'Seja o primeiro a criar um grupo!'}
            </p>
            {session?.user && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Grupo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {group.imageUrl ? (
                        <Image
                          src={group.imageUrl}
                          alt={group.name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                          {group.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {group.isPrivate ? (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Privado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              Público
                            </Badge>
                          )}
                          {group.category && (
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(group.category)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {group.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {group._count.members} {group._count.members === 1 ? 'membro' : 'membros'}
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {group._count.messages}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {group._count.events}
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Criado por {group.creator.name}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {group.isMember ? (
                      <Button asChild className="flex-1" variant="outline">
                        <Link href={`/dashboard/grupos/${group.id}`}>
                          Ver Grupo
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={isJoining === group.id}
                        className="flex-1"
                      >
                        {isJoining === group.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Entrando...
                          </>
                        ) : (
                          'Entrar no Grupo'
                        )}
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/grupos/${group.id}`}>
                        Ver Detalhes
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onGroupCreated={() => {
          fetchGroups()
        }}
      />
    </div>
  )
}