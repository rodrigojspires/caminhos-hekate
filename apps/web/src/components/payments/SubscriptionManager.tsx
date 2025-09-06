'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, CreditCard, AlertTriangle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/payments';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | 'TRIAL';
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  cancelReason?: string;
  trialEndDate?: string;
  plan: {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: 'MONTHLY' | 'YEARLY';
    intervalCount: number;
  };
  payments: {
    id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    paymentMethod: string;
    createdAt: string;
    paidAt?: string;
  }[];
}

interface SubscriptionManagerProps {
  userId?: string; // Para admins visualizarem assinaturas de outros usuários
}

export function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSubscriptions = async () => {
    try {
      const url = userId 
        ? `/api/payments/subscriptions?userId=${userId}`
        : '/api/payments/subscriptions';
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.data);
      } else {
        toast.error('Erro ao carregar assinaturas');
      }
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string, immediate: boolean = false) => {
    setIsUpdating(subscriptionId);

    try {
      if (immediate) {
        // Cancelamento imediato
        const response = await fetch(`/api/payments/subscriptions/${subscriptionId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          toast.success('Assinatura cancelada imediatamente');
          fetchSubscriptions();
        } else {
          throw new Error(data.error || 'Erro ao cancelar assinatura');
        }
      } else {
        // Cancelamento no final do período
        const response = await fetch(`/api/payments/subscriptions/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancelAtPeriodEnd: true,
            cancelReason: 'Cancelado pelo usuário',
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success('Assinatura será cancelada no final do período');
          fetchSubscriptions();
        } else {
          throw new Error(data.error || 'Erro ao cancelar assinatura');
        }
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar assinatura');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    setIsUpdating(subscriptionId);

    try {
      const response = await fetch(`/api/payments/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: false,
          cancelReason: null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Assinatura reativada com sucesso');
        fetchSubscriptions();
      } else {
        throw new Error(data.error || 'Erro ao reativar assinatura');
      }
    } catch (error) {
      console.error('Erro ao reativar assinatura:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao reativar assinatura');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: Subscription['status']) => {
    const statusConfig = {
      ACTIVE: { label: 'Ativa', variant: 'default' as const, icon: CheckCircle },
      TRIAL: { label: 'Período de Teste', variant: 'secondary' as const, icon: Clock },
      PENDING: { label: 'Pendente', variant: 'outline' as const, icon: Clock },
      CANCELLED: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
      EXPIRED: { label: 'Expirada', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      PAID: { label: 'Pago', variant: 'default' as const },
      PENDING: { label: 'Pendente', variant: 'outline' as const },
      FAILED: { label: 'Falhou', variant: 'destructive' as const },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: 'outline' as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando assinaturas...</span>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura encontrada</h3>
          <p className="text-gray-600 text-center">
            {userId ? 'Este usuário não possui assinaturas ativas.' : 'Você ainda não possui assinaturas ativas.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Minhas Assinaturas</h2>
        <Button onClick={fetchSubscriptions} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      {subscriptions.map((subscription) => (
        <Card key={subscription.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {subscription.plan.name}
                  {getStatusBadge(subscription.status)}
                </CardTitle>
                <CardDescription>{subscription.plan.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatCurrency(subscription.plan.price)}</div>
                <div className="text-sm text-gray-600">
                  por {subscription.plan.interval === 'MONTHLY' ? 'mês' : 'ano'}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Informações da Assinatura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Início</p>
                  <p className="text-sm text-gray-600">{formatDate(subscription.startDate)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Próxima Cobrança</p>
                  <p className="text-sm text-gray-600">{formatDate(subscription.endDate)}</p>
                </div>
              </div>
              
              {subscription.trialEndDate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Fim do Teste</p>
                    <p className="text-sm text-gray-600">{formatDate(subscription.trialEndDate)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso de Cancelamento */}
            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Assinatura será cancelada</p>
                  <p className="text-yellow-700">
                    Sua assinatura será cancelada em {formatDate(subscription.endDate)}
                    {subscription.cancelReason && ` - ${subscription.cancelReason}`}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Histórico de Pagamentos */}
            <div>
              <h4 className="font-semibold mb-3">Histórico de Pagamentos</h4>
              {subscription.payments.length > 0 ? (
                <div className="space-y-2">
                  {subscription.payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-600">
                            {formatDate(payment.createdAt)} • {payment.paymentMethod}
                          </p>
                        </div>
                      </div>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  ))}
                  {subscription.payments.length > 3 && (
                    <p className="text-sm text-gray-600 text-center">
                      +{subscription.payments.length - 3} pagamentos anteriores
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Nenhum pagamento registrado</p>
              )}
            </div>

            <Separator />

            {/* Ações */}
            <div className="flex gap-2">
              {subscription.status === 'ACTIVE' && !subscription.cancelAtPeriodEnd && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancelar no Final do Período
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sua assinatura será cancelada no final do período atual ({formatDate(subscription.endDate)}).
                          Você continuará tendo acesso até essa data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelSubscription(subscription.id, false)}
                          disabled={isUpdating === subscription.id}
                        >
                          {isUpdating === subscription.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Cancelar no Final do Período
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Cancelar Imediatamente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Assinatura Imediatamente</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sua assinatura será cancelada imediatamente e você perderá o acesso aos recursos premium.
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelSubscription(subscription.id, true)}
                          disabled={isUpdating === subscription.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isUpdating === subscription.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Cancelar Imediatamente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              {subscription.status === 'ACTIVE' && subscription.cancelAtPeriodEnd && (
                <Button
                  onClick={() => handleReactivateSubscription(subscription.id)}
                  disabled={isUpdating === subscription.id}
                  size="sm"
                >
                  {isUpdating === subscription.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reativar Assinatura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}