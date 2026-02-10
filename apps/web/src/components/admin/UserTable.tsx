"use client"

import { useState } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Crown,
  Shield,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
  registrationPortal: 'CAMINHOS_DE_HEKATE' | 'MAHA_LILAH' | null
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
    enrollments: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface UserTableProps {
  users: User[]
  pagination: Pagination
  onPageChange: (page: number) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onEdit: (userId: string) => void
  onDelete: (userId: string) => void
}

export function UserTable({
  users,
  pagination,
  onPageChange,
  onSort,
  onEdit,
  onDelete
}: UserTableProps) {
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Manipular ordenação
  const handleSort = (field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(field)
    setSortOrder(newSortOrder)
    onSort(field, newSortOrder)
  }

  // Renderizar ícone de ordenação
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-purple-600" /> : 
      <ChevronDown className="w-4 h-4 text-purple-600" />
  }

  // Renderizar badge de role
  const renderRoleBadge = (role: string) => {
    const configMap: Record<string, { icon: any; className: string; label: string }> = {
      ADMIN: { icon: Shield, className: 'bg-red-100 text-red-800', label: 'Admin' },
      EDITOR: { icon: Shield, className: 'bg-orange-100 text-orange-800', label: 'Editor' },
      MEMBER: { icon: User, className: 'bg-gray-100 text-gray-800', label: 'Membro' },
      VISITOR: { icon: User, className: 'bg-gray-100 text-gray-800', label: 'Visitante' },
    }
    const config = configMap[role] || configMap.MEMBER

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  // Renderizar badge de assinatura
  const renderSubscriptionBadge = (tier: string) => {
    const configMap: Record<string, { icon: any; className: string; label: string }> = {
      FREE: { icon: User, className: 'bg-gray-100 text-gray-800', label: 'Gratuito' },
      INICIADO: { icon: Crown, className: 'bg-purple-100 text-purple-800', label: 'Iniciado' },
      ADEPTO: { icon: Crown, className: 'bg-violet-100 text-violet-800', label: 'Adepto' },
      SACERDOCIO: { icon: Crown, className: 'bg-yellow-100 text-yellow-800', label: 'Sacerdócio' },
    }
    const config = configMap[tier] || configMap.FREE

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const renderPortalBadge = (portal: User['registrationPortal']) => {
    const configMap: Record<string, { className: string; label: string }> = {
      CAMINHOS_DE_HEKATE: { className: 'bg-emerald-100 text-emerald-800', label: 'Caminhos de Hekate' },
      MAHA_LILAH: { className: 'bg-sky-100 text-sky-800', label: 'Maha Lilah' },
    }

    if (!portal) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          -
        </span>
      )
    }

    const config = configMap[portal]

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // Status removido (não existe no modelo atual)

  // Selecionar/deselecionar usuário
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Selecionar/deselecionar todos
  const toggleAllSelection = () => {
    setSelectedUsers(prev => 
      prev.length === users.length ? [] : users.map(u => u.id)
    )
  }

  return (
    <div className="overflow-hidden">
      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={toggleAllSelection}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Nome
                  {renderSortIcon('name')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Email
                  {renderSortIcon('email')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</span>
              </th>
              
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assinatura</span>
              </th>

              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Portal</span>
              </th>

              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Atividade</span>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Criado em
                  {renderSortIcon('createdAt')}
                </button>
              </th>
              
              <th className="w-16 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Ações</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user.name || 'Sem nome'}</div>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                </td>
                
                <td className="px-4 py-4">
                  {renderRoleBadge(user.role)}
                </td>
                
                <td className="px-4 py-4">
                  {renderSubscriptionBadge(user.subscriptionTier)}
                </td>

                <td className="px-4 py-4">
                  {renderPortalBadge(user.registrationPortal)}
                </td>

                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <div>{user._count.orders} pedidos</div>
                    <div className="text-gray-500 dark:text-gray-400">{user._count.enrollments} cursos</div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(user.id)}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Editar usuário"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onDelete(user.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} usuários
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <span className="text-sm text-gray-700">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
