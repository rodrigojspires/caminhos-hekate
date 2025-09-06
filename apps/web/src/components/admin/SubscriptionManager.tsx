"use client"

import { useState } from 'react'
import { Crown, Zap, Star, Calendar, CreditCard, AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'
import { toast } from 'sonner'
import { format, addMonths, addYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface User {
  id: string
  name: string
  email: string
  subscription: 'FREE' | 'PREMIUM' | 'VIP'
  subscriptionExpiresAt?: string | null
  subscriptionStartedAt?: string | null
}

interface SubscriptionManagerProps {
  user: User
  onUpdate: () => void
}

interface SubscriptionPlan {
  id: 'FREE' | 'PREMIUM' | 'VIP'
  name: string
  description: string
  price: number
  features: string[]
  icon: React.ReactNode
  color: string
  bgColor: string
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Gratuito',
    description: 'Acesso básico à plataforma',
    price: 0,
    features: [
      'Acesso a conteúdo gratuito',
      'Comunidade básica',
      'Suporte por email'
    ],
    icon: <Star className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Acesso completo aos cursos',
    price: 97,
    features: [
      'Todos os cursos disponíveis',
      'Certificados de conclusão',
      'Suporte prioritário',
      'Acesso à comunidade premium'
    ],
    icon: <Crown className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    id: 'VIP',
    name: 'VIP',
    description: 'Experiência completa e exclusiva',
    price: 197,
    features: [
      'Tudo do Premium',
      'Mentorias individuais',
      'Acesso antecipado a novos cursos',
      'Grupo VIP exclusivo',
      'Suporte 24/7'
    ],
    icon: <Zap className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  }
]

export function SubscriptionManager({ user, onUpdate }: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'PREMIUM' | 'VIP'>(user.subscription)
  const [duration, setDuration] = useState<'monthly' | 'yearly'>('monthly')

  const currentPlan = subscriptionPlans.find(plan => plan.id === user.subscription)
  const newPlan = subscriptionPlans.find(plan => plan.id === selectedPlan)

  // Calcular data de expiração
  const calculateExpirationDate = (plan: 'FREE' | 'PREMIUM' | 'VIP', duration: 'monthly' | 'yearly') => {
    if (plan === 'FREE') return null
    
    const now = new Date()
    return duration === 'monthly' ? addMonths(now, 1) : addYears(now, 1)
  }

  // Atualizar assinatura
  const handleUpdateSubscription = async () => {
    if (selectedPlan === user.subscription) {
      toast.info('Nenhuma alteração foi feita')
      return
    }

    try {
      setLoading(true)
      
      const expirationDate = calculateExpirationDate(selectedPlan, duration)
      
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: selectedPlan,
          subscriptionExpiresAt: expirationDate?.toISOString() || null,
          subscriptionStartedAt: selectedPlan !== 'FREE' ? new Date().toISOString() : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar assinatura')
      }

      toast.success('Assinatura atualizada com sucesso')
      onUpdate()
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar assinatura')
    } finally {
      setLoading(false)
    }
  }

  // Cancelar assinatura
  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura deste usuário?')) {
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao cancelar assinatura')
      }

      toast.success('Assinatura cancelada com sucesso')
      onUpdate()
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar assinatura')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Status da Assinatura
        </h3>
        
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-lg ${currentPlan?.bgColor}`}>
            <div className={currentPlan?.color}>
              {currentPlan?.icon}
            </div>
          </div>
          
          <div>
            <div className="font-medium text-gray-900">
              Plano {currentPlan?.name}
            </div>
            <div className="text-sm text-gray-500">
              {currentPlan?.description}
            </div>
          </div>
        </div>
        
        {user.subscriptionStartedAt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Iniciado em:</span>
              <span className="font-medium">
                {format(new Date(user.subscriptionStartedAt), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            
            {user.subscriptionExpiresAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Expira em:</span>
                <span className="font-medium">
                  {format(new Date(user.subscriptionExpiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alterar plano */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Alterar Assinatura
        </h3>
        
        {/* Seleção de plano */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                  <div className={plan.color}>
                    {plan.icon}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-gray-900">{plan.name}</div>
                  <div className="text-sm text-gray-500">
                    {plan.price > 0 ? `R$ ${plan.price}/mês` : 'Gratuito'}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                {plan.description}
              </div>
              
              <ul className="text-xs text-gray-500 space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Duração (apenas para planos pagos) */}
        {selectedPlan !== 'FREE' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duração
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="monthly"
                  checked={duration === 'monthly'}
                  onChange={(e) => setDuration(e.target.value as 'monthly' | 'yearly')}
                  className="mr-2"
                />
                Mensal
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="yearly"
                  checked={duration === 'yearly'}
                  onChange={(e) => setDuration(e.target.value as 'monthly' | 'yearly')}
                  className="mr-2"
                />
                Anual (2 meses grátis)
              </label>
            </div>
          </div>
        )}
        
        {/* Resumo da alteração */}
        {selectedPlan !== user.subscription && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900 mb-1">
                  Alteração de Plano
                </div>
                <div className="text-sm text-blue-700">
                  {currentPlan?.name} → {newPlan?.name}
                  {selectedPlan !== 'FREE' && (
                    <span className="ml-2">
                      (R$ {newPlan?.price}/{duration === 'monthly' ? 'mês' : 'ano'})
                    </span>
                  )}
                </div>
                {selectedPlan !== 'FREE' && (
                  <div className="text-xs text-blue-600 mt-1">
                    Nova data de expiração: {calculateExpirationDate(selectedPlan, duration) && 
                      format(calculateExpirationDate(selectedPlan, duration)!, 'dd/MM/yyyy', { locale: ptBR })
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Botões */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpdateSubscription}
            disabled={loading || selectedPlan === user.subscription}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Atualizar Assinatura
          </button>
          
          {user.subscription !== 'FREE' && (
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Cancelar Assinatura
            </button>
          )}
        </div>
      </div>
    </div>
  )
}