'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, FileText, Smartphone, Loader2 } from 'lucide-react';
import { formatCurrency, PAYMENT_PROVIDERS } from '@/lib/payments';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  intervalCount: number;
  trialDays: number;
}

interface CustomerData {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface PaymentFormProps {
  plan: SubscriptionPlan;
  onPaymentSuccess: (data: any) => void;
  onCancel: () => void;
}

type PaymentProvider = 'MERCADOPAGO' | 'ASAAS';
type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'PIX';

export function PaymentForm({ plan, onPaymentSuccess, onCancel }: PaymentFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('MERCADOPAGO');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!customerData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    // Validações específicas para Asaas
    if (selectedProvider === 'ASAAS') {
      if (!customerData.cpfCnpj?.trim()) {
        newErrors.cpfCnpj = 'CPF/CNPJ é obrigatório para pagamentos via Asaas';
      }

      if (!customerData.phone?.trim()) {
        newErrors.phone = 'Telefone é obrigatório para pagamentos via Asaas';
      }

      if (selectedMethod === 'BOLETO') {
        if (!customerData.address?.street?.trim()) {
          newErrors['address.street'] = 'Endereço é obrigatório para boleto';
        }
        if (!customerData.address?.number?.trim()) {
          newErrors['address.number'] = 'Número é obrigatório para boleto';
        }
        if (!customerData.address?.neighborhood?.trim()) {
          newErrors['address.neighborhood'] = 'Bairro é obrigatório para boleto';
        }
        if (!customerData.address?.city?.trim()) {
          newErrors['address.city'] = 'Cidade é obrigatória para boleto';
        }
        if (!customerData.address?.state?.trim()) {
          newErrors['address.state'] = 'Estado é obrigatório para boleto';
        }
        if (!customerData.address?.zipCode?.trim()) {
          newErrors['address.zipCode'] = 'CEP é obrigatório para boleto';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          provider: selectedProvider,
          paymentMethod: selectedMethod,
          customerData: selectedProvider === 'ASAAS' ? customerData : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      toast.success('Pagamento iniciado com sucesso!');
      
      // Redireciona para a URL de pagamento
      if (data.data.paymentUrl) {
        window.open(data.data.paymentUrl, '_blank');
      }

      onPaymentSuccess(data.data);
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'BOLETO':
        return <FileText className="h-4 w-4" />;
      case 'PIX':
        return <Smartphone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPaymentMethodName = (method: PaymentMethod) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'DEBIT_CARD':
        return 'Cartão de Débito';
      case 'BOLETO':
        return 'Boleto Bancário';
      case 'PIX':
        return 'PIX';
      default:
        return method;
    }
  };

  const selectedProviderData = PAYMENT_PROVIDERS.find(p => p.name === selectedProvider);
  const availableMethods = selectedProviderData?.supportedMethods || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Resumo do Plano */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-gray-600">{plan.description}</p>
              {plan.trialDays > 0 && (
                <Badge variant="secondary" className="mt-2">
                  {plan.trialDays} dias grátis
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(plan.price)}</div>
              <div className="text-sm text-gray-600">
                por {plan.interval === 'MONTHLY' ? 'mês' : 'ano'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados de Pagamento</CardTitle>
          <CardDescription>
            Escolha o provedor e método de pagamento de sua preferência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seleção do Provedor */}
            <div className="space-y-2">
              <Label>Provedor de Pagamento</Label>
              <Select value={selectedProvider} onValueChange={(value: PaymentProvider) => setSelectedProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.name} value={provider.name}>
                      {provider.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção do Método de Pagamento */}
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableMethods.map((method) => (
                  <button
                    key={method.type}
                    type="button"
                    onClick={() => setSelectedMethod(method.type)}
                    className={`p-3 border rounded-lg flex items-center gap-2 transition-colors ${
                      selectedMethod === method.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {getPaymentMethodIcon(method.type)}
                    <span className="text-sm font-medium">{method.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Dados do Cliente */}
            <div className="space-y-4">
              <h3 className="font-semibold">Dados Pessoais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>

              {selectedProvider === 'ASAAS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                    <Input
                      id="cpfCnpj"
                      value={customerData.cpfCnpj}
                      onChange={(e) => setCustomerData({ ...customerData, cpfCnpj: e.target.value })}
                      className={errors.cpfCnpj ? 'border-red-500' : ''}
                    />
                    {errors.cpfCnpj && <p className="text-sm text-red-600">{errors.cpfCnpj}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                  </div>
                </div>
              )}

              {/* Endereço (obrigatório para boleto no Asaas) */}
              {selectedProvider === 'ASAAS' && selectedMethod === 'BOLETO' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Endereço (obrigatório para boleto)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">Rua *</Label>
                      <Input
                        id="street"
                        value={customerData.address?.street || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, street: e.target.value }
                        })}
                        className={errors['address.street'] ? 'border-red-500' : ''}
                      />
                      {errors['address.street'] && <p className="text-sm text-red-600">{errors['address.street']}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        value={customerData.address?.number || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, number: e.target.value }
                        })}
                        className={errors['address.number'] ? 'border-red-500' : ''}
                      />
                      {errors['address.number'] && <p className="text-sm text-red-600">{errors['address.number']}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={customerData.address?.neighborhood || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, neighborhood: e.target.value }
                        })}
                        className={errors['address.neighborhood'] ? 'border-red-500' : ''}
                      />
                      {errors['address.neighborhood'] && <p className="text-sm text-red-600">{errors['address.neighborhood']}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={customerData.address?.city || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, city: e.target.value }
                        })}
                        className={errors['address.city'] ? 'border-red-500' : ''}
                      />
                      {errors['address.city'] && <p className="text-sm text-red-600">{errors['address.city']}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={customerData.address?.state || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, state: e.target.value }
                        })}
                        className={errors['address.state'] ? 'border-red-500' : ''}
                      />
                      {errors['address.state'] && <p className="text-sm text-red-600">{errors['address.state']}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        value={customerData.address?.zipCode || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          address: { ...customerData.address!, zipCode: e.target.value }
                        })}
                        className={errors['address.zipCode'] ? 'border-red-500' : ''}
                      />
                      {errors['address.zipCode'] && <p className="text-sm text-red-600">{errors['address.zipCode']}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Pagar ${formatCurrency(plan.price)}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}