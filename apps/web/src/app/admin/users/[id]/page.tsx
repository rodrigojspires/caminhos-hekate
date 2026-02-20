'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Mail, Phone, Calendar, ShoppingBag, BookOpen, MapPin } from 'lucide-react'
import { UserForm } from '@/components/admin/UserForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SubscriptionManager } from '@/components/admin/SubscriptionManager'
import { MahaLilahSubscriptionManager } from '@/components/admin/MahaLilahSubscriptionManager'
import React from 'react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

interface TherapeuticTimelineItem {
  id: string
  source: 'PROCESS' | 'SINGLE'
  processId: string | null
  processStatus: 'IN_ANALYSIS' | 'IN_TREATMENT' | 'NOT_APPROVED' | 'CANCELED' | 'FINISHED' | null
  sessionNumber: number | null
  therapyName: string
  sessionDate: string | null
  createdAt: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELED'
  mode: 'IN_PERSON' | 'DISTANCE' | 'ONLINE' | null
  comments: string | null
  therapist: {
    id: string
    name: string | null
    email: string
  } | null
}

interface User {
  id: string
  name: string
  email: string
  dateOfBirth: string | null
  isTherapist: boolean
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
  therapeuticSessions: TherapeuticTimelineItem[]
}

interface UserFormData {
  name: string
  email: string
  dateOfBirth: string
  isTherapist: boolean
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

const therapeuticSessionStatusLabel: Record<TherapeuticTimelineItem['status'], string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
}

const therapeuticSessionModeLabel: Record<Exclude<TherapeuticTimelineItem['mode'], null>, string> = {
  IN_PERSON: 'Presencial',
  DISTANCE: 'Distância',
  ONLINE: 'Online',
}

const therapeuticProcessStatusLabel: Record<
  Exclude<TherapeuticTimelineItem['processStatus'], null>,
  string
> = {
  IN_ANALYSIS: 'Em análise',
  IN_TREATMENT: 'Em tratamento',
  NOT_APPROVED: 'Não aprovado',
  CANCELED: 'Cancelado',
  FINISHED: 'Finalizado',
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

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
        isTherapist: Boolean(userData.isTherapist),
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
        therapeuticSessions: Array.isArray(userData.therapeuticSessions)
          ? userData.therapeuticSessions.map((item: any) => ({
              id: String(item.id),
              source: item.source === 'SINGLE' ? 'SINGLE' : 'PROCESS',
              processId: item.processId ?? null,
              processStatus: item.processStatus ?? null,
              sessionNumber: typeof item.sessionNumber === 'number' ? item.sessionNumber : null,
              therapyName: item.therapyName ?? '',
              sessionDate: item.sessionDate ?? null,
              createdAt: item.createdAt,
              status: item.status,
              mode: item.mode ?? null,
              comments: item.comments ?? null,
              therapist: item.therapist
                ? {
                    id: String(item.therapist.id),
                    name: item.therapist.name ?? null,
                    email: item.therapist.email,
                  }
                : null,
            }))
          : [],
      }

      setUser(normalizedUser)
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      toast.error('Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

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
      fetchUser()
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

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
        <p className="text-hekate-pearl/60">Usuário não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-hekate-pearl">{user.name}</h1>
            <p className="text-hekate-pearl/60">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hekate-gold/20">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'details'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Detalhes
          </button>
          
          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'addresses'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Endereços ({user.addresses.length})
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'orders'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Pedidos ({user._count.orders})
          </button>
          
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'courses'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Cursos ({user._count.enrollments})
          </button>
          
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'subscription'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Assinatura
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'sessions'
                ? 'border-hekate-gold text-hekate-gold'
                : 'border-transparent text-hekate-pearl/60 hover:text-hekate-pearl hover:border-hekate-gold/50'
            }`}
          >
            Atendimentos ({user.therapeuticSessions.length})
          </button>
        </nav>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-lg border border-hekate-gold/20 p-6">
            <h2 className="text-lg font-semibold text-hekate-pearl mb-4">
              Informações do Usuário
            </h2>
            <UserForm
              user={user}
              onSave={handleSave}
              loading={saving}
            />
          </div>
          
          <div className="space-y-6">
            <div className="glass rounded-lg border border-hekate-gold/20 p-6">
              <h3 className="text-lg font-semibold text-hekate-pearl mb-4">
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-hekate-pearl/50" />
                  <div>
                    <div className="font-medium text-hekate-pearl/90">{user._count.orders} pedidos</div>
                    <div className="text-sm text-hekate-pearl/60">Total de compras</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-hekate-pearl/50" />
                  <div>
                    <div className="font-medium text-hekate-pearl/90">{user._count.enrollments} cursos</div>
                    <div className="text-sm text-hekate-pearl/60">Matrículas ativas</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-lg border border-hekate-gold/20 p-6">
              <h3 className="text-lg font-semibold text-hekate-pearl mb-4">
                Informações da Conta
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-hekate-pearl/50" />
                  <div>
                    <div className="font-medium text-hekate-pearl/90">Email {user.emailVerified ? 'verificado' : 'não verificado'}</div>
                    <div className="text-sm text-hekate-pearl/60">
                      {user.emailVerified 
                        ? format(new Date(user.emailVerified), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Verificação pendente'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-hekate-pearl/50" />
                  <div>
                    <div className="font-medium text-hekate-pearl/90">Membro desde</div>
                    <div className="text-sm text-hekate-pearl/60">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      {' '}({formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-hekate-pearl/50" />
                  <div>
                    <div className="font-medium text-hekate-pearl/90">Última atualização</div>
                    <div className="text-sm text-hekate-pearl/60">
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
        <div className="glass rounded-lg border border-hekate-gold/20">
          <div className="p-6 border-b border-hekate-gold/20">
            <h2 className="text-lg font-semibold text-hekate-pearl">Endereços cadastrados</h2>
            <p className="text-sm text-hekate-pearl/60 mt-1">Dados coletados durante o checkout ou informados pelo próprio cliente.</p>
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
                    className="rounded-lg border border-hekate-gold/20 bg-card p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-hekate-pearl">
                          <MapPin className="h-4 w-4 text-hekate-gold" />
                          <span className="font-semibold">
                            {address.name ?? 'Endereço'}
                          </span>
                          {typeLabel ? (
                            <Badge variant="outline">{typeLabel}</Badge>
                          ) : null}
                          {address.isDefault ? (
                            <Badge variant="secondary">Principal</Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-hekate-pearl/60">Criado em {createdLabel}</div>
                      </div>
                      <div className="text-xs text-hekate-pearl/60">Atualizado em {updatedLabel}</div>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm text-hekate-pearl/80">
                      {lines.length > 0 ? lines.join('\n') : 'Dados de endereço não informados.'}
                    </p>

                    {address.phone ? (
                      <div className="mt-2 inline-flex items-center gap-2 text-sm text-hekate-pearl/80">
                        <Phone className="h-4 w-4 text-hekate-pearl/50" />
                        <span>{address.phone}</span>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-sm text-hekate-pearl/60">
                Nenhum endereço cadastrado para este cliente.
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'orders' && (
        <div className="glass rounded-lg border border-hekate-gold/20">
          <div className="p-6 border-b border-hekate-gold/20">
            <h2 className="text-lg font-semibold text-hekate-pearl">Histórico de Pedidos</h2>
          </div>
          <div className="p-6 space-y-4">
            {user.orders.length > 0 ? (
              user.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-hekate-gold/20 rounded-lg bg-card">
                  <div>
                    <div className="font-medium text-hekate-pearl">Pedido #{order.id.slice(-8)}</div>
                    <div className="text-sm text-hekate-pearl/60">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-hekate-pearl">{formatCurrency(order.total)}</div>
                    <div className="text-sm text-hekate-pearl/60">{order.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-hekate-pearl/60 text-center py-8">
                Nenhum pedido encontrado
              </p>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'courses' && (
        <div className="glass rounded-lg border border-hekate-gold/20">
          <div className="p-6 border-b border-hekate-gold/20">
            <h2 className="text-lg font-semibold text-hekate-pearl">Cursos Matriculados</h2>
          </div>
          <div className="p-6 space-y-4">
            {user.enrollments.length > 0 ? (
              user.enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border border-hekate-gold/20 rounded-lg bg-card">
                  <div>
                    <div className="font-medium text-hekate-pearl">{enrollment.course.title}</div>
                    <div className="text-sm text-hekate-pearl/60">
                      Matriculado em {format(new Date(enrollment.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-hekate-pearl">{enrollment.progress}% concluído</div>
                    <div className="text-sm text-hekate-pearl/60">{enrollment.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-hekate-pearl/60 text-center py-8">
                Nenhum curso encontrado
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="glass rounded-lg border border-hekate-gold/20">
          <div className="p-6 border-b border-hekate-gold/20">
            <h2 className="text-lg font-semibold text-hekate-pearl">Sessões de Atendimento</h2>
            <p className="text-sm text-hekate-pearl/60 mt-1">
              Sessões avulsas e sessões de processo, ordenadas por data.
            </p>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-hekate-pearl/60">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 font-medium">Terapia</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Modo</th>
                  <th className="px-3 py-2 font-medium">Atendente</th>
                  <th className="px-3 py-2 font-medium">Processo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-hekate-pearl">
                {user.therapeuticSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-hekate-pearl/60">
                      Nenhuma sessão encontrada para este usuário.
                    </td>
                  </tr>
                ) : (
                  user.therapeuticSessions.map((sessionItem) => {
                    const sessionDateLabel = sessionItem.sessionDate
                      ? format(new Date(sessionItem.sessionDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : 'Data da sessão não informada'

                    return (
                      <tr key={sessionItem.id} className="hover:bg-white/5">
                        <td className="px-3 py-2">{sessionDateLabel}</td>
                        <td className="px-3 py-2">
                          {sessionItem.source === 'PROCESS' ? 'Processo terapêutico' : 'Sessão avulsa'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{sessionItem.therapyName || '-'}</div>
                          {sessionItem.sessionNumber ? (
                            <div className="text-xs text-hekate-pearl/60">Sessão #{sessionItem.sessionNumber}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {therapeuticSessionStatusLabel[sessionItem.status] ?? sessionItem.status}
                        </td>
                        <td className="px-3 py-2">
                          {sessionItem.mode ? therapeuticSessionModeLabel[sessionItem.mode] : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {sessionItem.therapist ? (
                            <>
                              <div className="font-medium">{sessionItem.therapist.name || 'Sem nome'}</div>
                              <div className="text-hekate-pearl/60">{sessionItem.therapist.email}</div>
                            </>
                          ) : (
                            <span className="text-hekate-pearl/60">Não informado</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {sessionItem.processId ? (
                            <div className="space-y-1">
                              <button
                                className="rounded border px-2 py-1 text-xs hover:bg-muted"
                                onClick={() => router.push(`/admin/atendimentos/${sessionItem.processId}`)}
                              >
                                Abrir processo
                              </button>
                              <div className="text-xs text-hekate-pearl/60">
                                {sessionItem.processStatus
                                  ? therapeuticProcessStatusLabel[sessionItem.processStatus]
                                  : '-'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-hekate-pearl/60">Sessão avulsa</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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
          <MahaLilahSubscriptionManager userId={user.id} />
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
    <div className="glass rounded-lg border border-hekate-gold/20">
      <div className="p-6 border-b border-hekate-gold/20">
        <h2 className="text-lg font-semibold text-hekate-pearl">Histórico de Faturas</h2>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-hekate-pearl/60">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pago em</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-hekate-pearl">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-hekate-pearl/60">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-hekate-pearl/60">Nenhuma fatura encontrada</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">{inv.id.slice(-8)}</td>
                  <td className="px-4 py-3">{inv.subscription?.plan?.name || '-'}</td>
                  <td className="px-4 py-3">R$ {Number(inv.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{inv.status}</td>
                  <td className="px-4 py-3">{inv.paidAt ? new Date(inv.paidAt).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3">{new Date(inv.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
