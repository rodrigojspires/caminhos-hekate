"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Users, UserCheck, UserX, Crown, Plus } from 'lucide-react'
import { UserTable } from '@/components/admin/UserTable'
import { UserFilters } from '@/components/admin/UserFilters'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { toast } from 'sonner'

interface User {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'ADMIN'
  subscription: 'FREE' | 'PREMIUM' | 'VIP'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  subscriptionExpiresAt: string | null
  _count: {
    orders: number
    enrollments: number
  }
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  premiumUsers: number
}

interface UserFilters {
  search: string
  role: string
  subscription: string
  status: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    subscription: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Buscar usuários
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Erro ao buscar usuários')
      
      const data = await response.json()
      setUsers(data.users)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [filters, searchTerm])

  // Aplicar filtros
  const handleFiltersChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Exportar usuários
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
        export: 'true'
      })

      const response = await fetch(`/api/admin/users/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar usuários')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Usuários exportados com sucesso')
    } catch (error) {
      console.error('Erro ao exportar usuários:', error)
      toast.error('Erro ao exportar usuários')
    }
  }

  // Excluir usuário
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir usuário')
      }

      toast.success('Usuário excluído com sucesso')
      fetchUsers(currentPage)
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast.error('Erro ao excluir usuário')
    }
  }

  // Efeitos
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie todos os usuários da plataforma</p>
        </div>
        
        <button
          onClick={() => router.push('/admin/users/new')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Barra de busca e filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={filters.search}
              onChange={(e) => handleFiltersChange({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
        
        {/* Filtros expandidos */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <UserFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        )}
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total de Usuários</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.totalUsers?.toLocaleString() || '0'}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Usuários Ativos</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Usuários Premium</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => ['PREMIUM', 'VIP'].includes(u.subscription)).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Novos (30 dias)</div>
          <div className="text-2xl font-bold text-blue-600">
            {users.filter(u => {
              const createdAt = new Date(u.createdAt)
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              return createdAt >= thirtyDaysAgo
            }).length}
          </div>
        </div>
      </div>

      {/* Tabela de usuários */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <UserTable
            users={users}
            pagination={{
              page: currentPage,
              limit: 10,
              total: stats?.totalUsers || 0,
              totalPages: totalPages,
              hasNext: currentPage < totalPages,
              hasPrev: currentPage > 1
            }}
            onPageChange={fetchUsers}
            onSort={(sortBy, sortOrder) => {
              setFilters(prev => ({ ...prev, sortBy, sortOrder }))
            }}
            onEdit={(userId) => {
              router.push(`/admin/users/${userId}`)
            }}
            onDelete={handleDeleteUser}
          />
        )}
      </div>
    </div>
  )
}