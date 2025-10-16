"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Mail, Phone, Calendar, ShoppingBag, BookOpen, MapPin } from 'lucide-react'
import { UserForm } from '@/components/admin/UserForm'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { SubscriptionManager } from '@/components/admin/SubscriptionManager'
import React from 'react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface UserAddress {
  id: string
  name: string | null
  street: string
  number: string | null
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
  emailVerified: string | null
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
    enrollments: number
  }
  addresses: UserAddress[]
  orders: Array<{
    id: string
    total: number
    status: string
    createdAt: string
  }>
  enrollments: Array<{
    id: string
    progress: number
    status: string
    createdAt: string
    course: {
      id: string
      title: string
    }
  }>
}

interface UserFormData {
  name: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
}

const formatPostalCode = (value?: string | null) => {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return value
}

const getAddressLines = (address: UserAddress) => {
  const country = address.country ? address.country.trim() : null
  const shouldShowCountry =
    country && !['BR', 'Brasil', 'Brazil'].includes(country.toUpperCase())

  const lines = [
    [address.street, address.number].filter(Boolean).join(', ').trim(),
    address.complement?.trim(),
    address.neighborhood?.trim(),
    [address.city, address.state].filter(Boolean).join(' - ').trim(),
    formatPostalCode(address.zipCode) ? `CEP ${formatPostalCode(address.zipCode)}` : null,
    shouldShowCountry ? country : null,
  ].filter((line) => line && line.length > 0)

  return lines
}

const getAddressTypeLabel = (address: UserAddress) => {
  const name = address.name?.toLowerCase() ?? ''
  if (name.includes('cobr')) return 'Cobrança'
  if (name.includes('entreg')) return 'Entrega'
  return null
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Buscar dados do usuário
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Usuário não encontrado')
          router.push('/admin/users')
          return
        }
        throw new Error('Erro ao buscar usuário')
      }

      const userData = await response.json()
      const toNumber = (value: any) => {
        if (typeof value === 'number') return value
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }

      const normalizeAddress = (address: any): UserAddress => ({
        id: String(address.id),
        name: address.name ?? null,
        street: address.street ?? '',
        number: address.number ?? null,
        complement: address.complement ?? null,
        neighborhood: address.neighborhood ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        zipCode: address.zipCode ?? '',
        country: address.country ?? '',
        phone: address.phone ?? null,
        isDefault: Boolean(address.isDefault),
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      })

      const normalizedUser: User = {
        ...userData,
        orders: Array.isArray(userData.orders)
          ? userData.orders.map((order: any) => ({
              ...order,
              total: toNumber(order.total),
            }))
          : [],
        addresses: Array.isArray(userData.addresses)
          ? userData.addresses.map(normalizeAddress)
          : [],
        enrollments: Array.isArray(userData.enrollments) ? userData.enrollments : [],
      }

      setUser(normalizedUser)
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      toast.error('Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  // Salvar alterações
  const handleSave = async (formData: UserFormData) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar usuário')
      }

      toast.success('Usuário atualizado com sucesso')
      fetchUser() // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  // Excluir usuário
  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir usuário')
      }

      toast.success('Usuário excluído com sucesso')
      router.push('/admin/users')
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir usuário')
    }
  }

  // Status removido (não existe no modelo atual)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Usuário não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detalhes
          </button>
          
          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'addresses'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Endereços ({user.addresses.length})
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pedidos ({user._count.orders})
          </button>
          
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'courses'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cursos ({user._count.enrollments})
          </button>
          
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscription'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assinatura
          </button>
        </nav>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de edição */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informações do Usuário
              </h2>
              
              <UserForm
                user={user}
                onSave={handleSave}
                loading={saving}
              />
            </div>
          </div>
          
          {/* Informações adicionais */}
          <div className="space-y-6">
            {/* Estatísticas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Estatísticas
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user._count.orders} pedidos
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Total de compras
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user._count.enrollments} cursos
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Matrículas ativas
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Informações da conta */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informações da Conta
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Email {user.emailVerified ? 'verificado' : 'não verificado'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.emailVerified 
                        ? format(new Date(user.emailVerified), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Verificação pendente'
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Membro desde
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      {' '}({formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })})
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Última atualização
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'addresses' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Endereços cadastrados
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dados coletados durante o checkout ou informados pelo próprio cliente.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {user.addresses.length > 0 ? (
              user.addresses.map((address) => {
                const lines = getAddressLines(address)
                const typeLabel = getAddressTypeLabel(address)
                const updatedLabel = format(new Date(address.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                const createdLabel = format(new Date(address.createdAt), 'dd/MM/yyyy', { locale: ptBR })

                return (
                  <div
                    key={address.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-gray-900 dark:text-gray-100">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold">
                            {address.name ?? 'Endereço'}
                          </span>
                          {typeLabel ? (
                            <Badge variant="outline" className="border-purple-200 text-purple-600">
                              {typeLabel}
                            </Badge>
                          ) : null}
                          {address.isDefault ? (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-800">
                              Principal
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Criado em {createdLabel}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Atualizado em {updatedLabel}
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                      {lines.length > 0 ? lines.join('\n') : 'Dados de endereço não informados.'}
                    </p>

                    {address.phone ? (
                      <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{address.phone}</span>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum endereço cadastrado para este cliente.
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Histórico de Pedidos
            </h2>
          </div>
          
          <div className="p-6">
            {user.orders.length > 0 ? (
              <div className="space-y-4">
                {user.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Pedido #{order.id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.total)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Nenhum pedido encontrado
              </p>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'courses' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cursos Matriculados
            </h2>
          </div>
          
          <div className="p-6">
            {user.enrollments.length > 0 ? (
              <div className="space-y-4">
                {user.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {enrollment.course.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Matriculado em {format(new Date(enrollment.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {enrollment.progress}% concluído
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {enrollment.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Nenhum curso encontrado
              </p>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <SubscriptionManager
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              subscriptionTier: user.subscriptionTier,
            }}
            onUpdate={fetchUser}
          />

          {/* Histórico de Faturas */}
          <UserInvoices userId={user.id} />
        </div>
      )}
    </div>
  )
}

function UserInvoices({ userId }: { userId: string }) {
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/users/${userId}/invoices`)
        const data = await res.json()
        if (res.ok) setInvoices(data.invoices || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Histórico de Faturas</h2>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Plano</th>
              <th className="px-4 py-2 text-left">Valor</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Pago em</th>
              <th className="px-4 py-2 text-left">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6">Nenhuma fatura encontrada</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-2">{inv.id.slice(-8)}</td>
                  <td className="px-4 py-2">{inv.subscription?.plan?.name || '-'}</td>
                  <td className="px-4 py-2">R$ {Number(inv.amount).toFixed(2)}</td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2">{inv.paidAt ? new Date(inv.paidAt).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-2">{new Date(inv.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
