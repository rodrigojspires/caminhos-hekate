'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  X,
  Download,
  Eye,
  Zap,
} from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import { formatDistanceToNow, format, addDays, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Subscription {
  id: string
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED' | 'TRIALING'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  plan: {
    id: string
    name: string
    price: number
    interval: 'MONTHLY' | 'YEARLY'
    features: string[]
  }
  paymentMethod?: {
    type: string
    lastFourDigits: string
    brand: string
  }
}

interface PaymentIssue {
  id: string
  type: 'FAILED_PAYMENT' | 'EXPIRED_CARD' | 'INSUFFICIENT_FUNDS' | 'CANCELLED_BY_BANK'
  description: string
  amount: number
  attemptedAt: string
  nextRetryAt?: string
  canRetry: boolean
}

interface PaymentStatusData {
  subscription?: Subscription
  paymentIssues: PaymentIssue[]
  nextPayment?: {
    amount: number
    dueDate: string
    description: string
  }
  usage?: {
    current: number
    limit: number
    resetDate: string
  }
  credits?: {
    balance: number
    expiresAt?: string
  }
}

interface PaymentStatusProps {
  userId?: string
  className?: string
}

const SUBSCRIPTION_STATUS_CONFIG = {
  ACTIVE: {
    label: 'Ativa',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  TRIALING: {
    label: 'Período de Teste',
    variant: 'outline' as const,
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  PAST_DUE: {
    label: 'Pagamento Atrasado',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  CANCELLED: {
    label: 'Cancelada',
    variant: 'secondary' as const,
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  PAUSED: {
    label: 'Pausada',
    variant: 'outline' as const,
    icon: Pause,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
}

const PAYMENT_ISSUE_CONFIG = {
  FAILED_PAYMENT: {
    title: 'Falha no Pagamento',
    description: 'O pagamento não pôde ser processado',
    icon: XCircle,
    color: 'text-red-600',
  },
  EXPIRED_CARD: {
    title: 'Cartão Expirado',
    description: 'O cartão de crédito expirou',
    icon: CreditCard,
    color: 'text-orange-600',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Saldo Insuficiente',
    description: 'Não há saldo suficiente no cartão',
    icon: DollarSign,
    color: 'text-red-600',
  },
  CANCELLED_BY_BANK: {
    title: 'Cancelado pelo Banco',
    description: 'O banco cancelou a transação',
    icon: AlertTriangle,
    color: 'text-red-600',
  },
}

export function PaymentStatus({ userId, className = '' }: PaymentStatusProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null)
  const [pausingSubscription, setPausingSubscription] = useState(false)
  const [resumingSubscription, setResumingSubscription] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)

  // Buscar status de pagamento
  const fetchPaymentStatus = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/status${userId ? `?userId=${userId}` : ''}`)
      if (!response.ok) throw new Error('Erro ao buscar status')
      
      const data = await response.json()
      setPaymentStatus(data)
    } catch (error) {
      console.error('Erro ao buscar status:', error)
      toast.error('Erro ao carregar status de pagamento')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Tentar pagamento novamente
  const retryPayment = async (issueId: string) => {
    setRetryingPayment(issueId)
    try {
      const response = await fetch(`/api/payments/retry/${issueId}`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Erro ao tentar novamente')
      
      toast.success('Tentativa de pagamento iniciada')
      fetchPaymentStatus()
    } catch (error) {
      console.error('Erro ao tentar pagamento:', error)
      toast.error('Erro ao tentar pagamento novamente')
    } finally {
      setRetryingPayment(null)
    }
  }

  // Pausar assinatura
  const pauseSubscription = async () => {
    if (!paymentStatus?.subscription) return
    
    setPausingSubscription(true)
    try {
      const response = await fetch(`/api/subscriptions/${paymentStatus.subscription.id}/pause`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Erro ao pausar')
      
      toast.success('Assinatura pausada com sucesso')
      fetchPaymentStatus()
    } catch (error) {
      console.error('Erro ao pausar:', error)
      toast.error('Erro ao pausar assinatura')
    } finally {
      setPausingSubscription(false)
    }
  }

  // Retomar assinatura
  const resumeSubscription = async () => {
    if (!paymentStatus?.subscription) return
    
    setResumingSubscription(true)
    try {
      const response = await fetch(`/api/subscriptions/${paymentStatus.subscription.id}/resume`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Erro ao retomar')
      
      toast.success('Assinatura retomada com sucesso')
      fetchPaymentStatus()
    } catch (error) {
      console.error('Erro ao retomar:', error)
      toast.error('Erro ao retomar assinatura')
    } finally {
      setResumingSubscription(false)
    }
  }

  // Cancelar assinatura
  const cancelSubscription = async () => {
    if (!paymentStatus?.subscription) return
    
    setCancellingSubscription(true)
    try {
      const response = await fetch(`/api/subscriptions/${paymentStatus.subscription.id}/cancel`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Erro ao cancelar')
      
      toast.success('Assinatura cancelada com sucesso')
      fetchPaymentStatus()
    } catch (error) {
      console.error('Erro ao cancelar:', error)
      toast.error('Erro ao cancelar assinatura')
    } finally {
      setCancellingSubscription(false)
    }
  }

  // Baixar fatura
  const downloadInvoice = async () => {
    try {
      const response = await fetch('/api/payments/invoice/current')
      if (!response.ok) throw new Error('Erro ao gerar fatura')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-${format(new Date(), 'yyyy-MM')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao baixar fatura:', error)
      toast.error('Erro ao baixar fatura')
    }
  }

  useEffect(() => {
    fetchPaymentStatus()
  }, [fetchPaymentStatus])

  const getSubscriptionStatusBadge = (status: Subscription['status']) => {
    const config = SUBSCRIPTION_STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    )
  }

  const getDaysUntilRenewal = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date())
  }

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100)
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status da Assinatura */}
      {paymentStatus?.subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Status da Assinatura
                </CardTitle>
                <CardDescription>
                  Informações sobre sua assinatura atual
                </CardDescription>
              </div>
              {getSubscriptionStatusBadge(paymentStatus.subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Plano Atual</p>
                <p className="text-lg font-semibold">{paymentStatus.subscription.plan.name}</p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(paymentStatus.subscription.plan.price)}/
                  {paymentStatus.subscription.plan.interval === 'MONTHLY' ? 'mês' : 'ano'}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Próxima Cobrança</p>
                <p className="text-lg font-semibold">
                  {format(new Date(paymentStatus.subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <p className="text-sm text-gray-600">
                  {getDaysUntilRenewal(paymentStatus.subscription.currentPeriodEnd) > 0
                    ? `Em ${getDaysUntilRenewal(paymentStatus.subscription.currentPeriodEnd)} dias`
                    : 'Vencida'
                  }
                </p>
              </div>
              
              {paymentStatus.subscription.paymentMethod && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Método de Pagamento</p>
                  <p className="text-lg font-semibold">
                    {paymentStatus.subscription.paymentMethod.brand} •••• {paymentStatus.subscription.paymentMethod.lastFourDigits}
                  </p>
                  <p className="text-sm text-gray-600">
                    {paymentStatus.subscription.paymentMethod.type}
                  </p>
                </div>
              )}
            </div>
            
            {paymentStatus.subscription.status === 'TRIALING' && paymentStatus.subscription.trialEnd && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <p className="font-medium text-blue-900">Período de Teste</p>
                </div>
                <p className="text-sm text-blue-700">
                  Seu período de teste termina em {format(new Date(paymentStatus.subscription.trialEnd), 'dd/MM/yyyy', { locale: ptBR })}.
                  Após essa data, você será cobrado automaticamente.
                </p>
              </div>
            )}
            
            {paymentStatus.subscription.cancelAtPeriodEnd && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <p className="font-medium text-orange-900">Cancelamento Agendado</p>
                </div>
                <p className="text-sm text-orange-700">
                  Sua assinatura será cancelada em {format(new Date(paymentStatus.subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}.
                  Você ainda pode usar o serviço até essa data.
                </p>
              </div>
            )}
            
            <Separator />
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadInvoice}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Fatura
              </Button>
              
              {paymentStatus.subscription.status === 'ACTIVE' && (
                <>
                  <Button
                    variant="outline"
                    onClick={pauseSubscription}
                    disabled={pausingSubscription}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    {pausingSubscription ? 'Pausando...' : 'Pausar'}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja cancelar sua assinatura? Você ainda terá acesso até o final do período atual.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={cancelSubscription}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={cancellingSubscription}
                        >
                          {cancellingSubscription ? 'Cancelando...' : 'Cancelar Assinatura'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              
              {paymentStatus.subscription.status === 'PAUSED' && (
                <Button
                  onClick={resumeSubscription}
                  disabled={resumingSubscription}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {resumingSubscription ? 'Retomando...' : 'Retomar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Problemas de Pagamento */}
      {paymentStatus?.paymentIssues && paymentStatus.paymentIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Problemas de Pagamento
            </CardTitle>
            <CardDescription>
              Resolva estes problemas para manter sua assinatura ativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentStatus.paymentIssues.map((issue) => {
                const config = PAYMENT_ISSUE_CONFIG[issue.type]
                const Icon = config.icon
                
                return (
                  <div key={issue.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">{config.title}</h4>
                          <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-red-600">
                            <span>Valor: {formatCurrency(issue.amount)}</span>
                            <span>
                              Tentativa: {format(new Date(issue.attemptedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            {issue.nextRetryAt && (
                              <span>
                                Próxima tentativa: {format(new Date(issue.nextRetryAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {issue.canRetry && (
                        <Button
                          size="sm"
                          onClick={() => retryPayment(issue.id)}
                          disabled={retryingPayment === issue.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${retryingPayment === issue.id ? 'animate-spin' : ''}`} />
                          {retryingPayment === issue.id ? 'Tentando...' : 'Tentar Novamente'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximo Pagamento */}
      {paymentStatus?.nextPayment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximo Pagamento
            </CardTitle>
            <CardDescription>
              Informações sobre sua próxima cobrança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{paymentStatus.nextPayment.description}</p>
                <p className="text-sm text-gray-600">
                  Vencimento: {format(new Date(paymentStatus.nextPayment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(paymentStatus.nextPayment.amount)}</p>
                <p className="text-sm text-gray-600">
                  {getDaysUntilRenewal(paymentStatus.nextPayment.dueDate) > 0
                    ? `Em ${getDaysUntilRenewal(paymentStatus.nextPayment.dueDate)} dias`
                    : 'Vencido'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uso e Limites */}
      {paymentStatus?.usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uso do Plano
            </CardTitle>
            <CardDescription>
              Acompanhe o uso dos recursos do seu plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uso Atual</span>
                <span className="text-sm text-gray-600">
                  {paymentStatus.usage.current.toLocaleString()} / {paymentStatus.usage.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={getUsagePercentage(paymentStatus.usage.current, paymentStatus.usage.limit)} />
              <p className="text-xs text-gray-600">
                Limite renovado em {format(new Date(paymentStatus.usage.resetDate), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Créditos */}
      {paymentStatus?.credits && paymentStatus.credits.balance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Créditos Disponíveis
            </CardTitle>
            <CardDescription>
              Saldo de créditos em sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(paymentStatus.credits.balance)}
                </p>
                <p className="text-sm text-green-700">Saldo disponível</p>
              </div>
              {paymentStatus.credits.expiresAt && (
                <div className="text-right">
                  <p className="text-sm font-medium">Expira em:</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(paymentStatus.credits.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}