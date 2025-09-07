'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/payments';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  intervalCount: number;
  trialDays: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  monthlyPrice?: number;
  yearlyPrice?: number;
}

interface PlanSelectorProps {
  onPlanSelect: (plan: SubscriptionPlan) => void;
  selectedPlanId?: string;
  loading?: boolean;
  billing?: 'MONTHLY' | 'YEARLY';
}

export function PlanSelector({ onPlanSelect, selectedPlanId, loading = false, billing = 'MONTHLY' }: PlanSelectorProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payments/plans');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar planos');
      }

      setPlans(data.data);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      setError('Erro ao carregar planos de assinatura');
      toast.error('Erro ao carregar planos de assinatura');
    } finally {
      setIsLoading(false);
    }
  };

  const getIntervalText = (interval: string, count: number) => {
    if (interval === 'MONTHLY') {
      return count === 1 ? 'mensal' : `${count} meses`;
    }
    if (interval === 'YEARLY') {
      return count === 1 ? 'anual' : `${count} anos`;
    }
    return interval.toLowerCase();
  };

  const getDisplayPrice = (plan: SubscriptionPlan) => {
    if (billing === 'YEARLY') {
      if (typeof plan.yearlyPrice === 'number' && plan.yearlyPrice > 0) return plan.yearlyPrice
      // fallback
      return plan.price * 12
    }
    return plan.price
  }

  const getMonthlyEquivalent = (plan: SubscriptionPlan) => {
    const yearly = typeof plan.yearlyPrice === 'number' && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.price * 12
    return yearly / 12
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchPlans} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Nenhum plano de assinatura disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const displayPrice = getDisplayPrice(plan)
        const monthlyEq = getMonthlyEquivalent(plan)
        
        return (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${
              plan.isPopular ? 'border-blue-500' : ''
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-3 py-1">
                  Mais Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center">
              <div className="mb-6">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(displayPrice)}
                </div>
                <div className="text-sm text-gray-600">
                  por {billing === 'YEARLY' ? 'ano' : getIntervalText('MONTHLY', 1)}
                </div>
                {billing === 'YEARLY' && (
                  <div className="text-xs text-green-600 mt-1">{formatCurrency(monthlyEq)}/mês</div>
                )}
              </div>
              
              {plan.trialDays > 0 && (
                <div className="mb-4">
                  <Badge variant="secondary" className="text-xs">
                    {plan.trialDays} dias grátis
                  </Badge>
                </div>
              )}
              
              <div className="space-y-3 text-left">
                {plan.features?.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                onClick={() => onPlanSelect({ ...plan, price: getDisplayPrice(plan), interval: billing })}
                disabled={loading || !plan.isActive}
                className={`w-full ${
                  isSelected 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : plan.isPopular 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : ''
                }`}
                variant={plan.isPopular ? 'default' : 'outline'}
              >
                {loading && selectedPlanId === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : isSelected ? (
                  'Plano Selecionado'
                ) : (
                  'Selecionar Plano'
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
