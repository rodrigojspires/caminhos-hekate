'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Edit,
  Plus,
  Trash2,
  User,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { formatCPF, formatCNPJ, formatPhone, formatCEP } from '@/lib/format'

interface BillingAddress {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface PaymentMethod {
  id: string
  type: 'CREDIT_CARD' | 'DEBIT_CARD'
  brand: string
  lastFourDigits: string
  expiryMonth: number
  expiryYear: number
  holderName: string
  isDefault: boolean
  createdAt: string
}

interface BillingInfo {
  id: string
  name: string
  email: string
  phone?: string
  document: string
  documentType: 'CPF' | 'CNPJ'
  address?: BillingAddress
  paymentMethods: PaymentMethod[]
  updatedAt: string
}

interface BillingInfoProps {
  userId?: string
  className?: string
}

const CARD_BRANDS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  elo: 'Elo',
  hipercard: 'Hipercard',
}

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

export function BillingInfo({ userId, className = '' }: BillingInfoProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false)
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    documentType: 'CPF' as 'CPF' | 'CNPJ',
  })
  const [addressForm, setAddressForm] = useState<BillingAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'BR',
  })
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    cardNumber: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  })
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false)

  // Buscar informações de cobrança
  const fetchBillingInfo = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/billing${userId ? `?userId=${userId}` : ''}`)
      if (!response.ok) throw new Error('Erro ao buscar informações')
      
      const data = await response.json()
      setBillingInfo(data)
      
      // Preencher formulários
      if (data) {
        setPersonalForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          document: data.document || '',
          documentType: data.documentType || 'CPF',
        })
        
        if (data.address) {
          setAddressForm(data.address)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações:', error)
      toast.error('Erro ao carregar informações de cobrança')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Salvar informações pessoais
  const savePersonalInfo = async () => {
    setSavingPersonal(true)
    try {
      const response = await fetch('/api/billing/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalForm),
      })
      
      if (!response.ok) throw new Error('Erro ao salvar')
      
      toast.success('Informações pessoais atualizadas')
      setEditingPersonal(false)
      fetchBillingInfo()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar informações pessoais')
    } finally {
      setSavingPersonal(false)
    }
  }

  // Salvar endereço
  const saveAddress = async () => {
    setSavingAddress(true)
    try {
      const response = await fetch('/api/billing/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      })
      
      if (!response.ok) throw new Error('Erro ao salvar')
      
      toast.success('Endereço atualizado')
      setEditingAddress(false)
      fetchBillingInfo()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar endereço')
    } finally {
      setSavingAddress(false)
    }
  }

  // Adicionar método de pagamento
  const addPaymentMethod = async () => {
    setSavingPaymentMethod(true)
    try {
      const response = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentMethodForm),
      })
      
      if (!response.ok) throw new Error('Erro ao adicionar')
      
      toast.success('Método de pagamento adicionado')
      setAddingPaymentMethod(false)
      setPaymentMethodForm({
        cardNumber: '',
        holderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
      })
      fetchBillingInfo()
    } catch (error) {
      console.error('Erro ao adicionar:', error)
      toast.error('Erro ao adicionar método de pagamento')
    } finally {
      setSavingPaymentMethod(false)
    }
  }

  // Remover método de pagamento
  const removePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/billing/payment-methods/${methodId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Erro ao remover')
      
      toast.success('Método de pagamento removido')
      fetchBillingInfo()
    } catch (error) {
      console.error('Erro ao remover:', error)
      toast.error('Erro ao remover método de pagamento')
    }
  }

  // Definir como padrão
  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/billing/payment-methods/${methodId}/default`, {
        method: 'PUT',
      })
      
      if (!response.ok) throw new Error('Erro ao definir padrão')
      
      toast.success('Método de pagamento padrão atualizado')
      fetchBillingInfo()
    } catch (error) {
      console.error('Erro ao definir padrão:', error)
      toast.error('Erro ao definir método padrão')
    }
  }

  // Buscar endereço por CEP
  const fetchAddressByCEP = async (cep: string) => {
    if (cep.length !== 8) return
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
      
      if (!data.erro) {
        setAddressForm(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
  }

  useEffect(() => {
    fetchBillingInfo()
  }, [fetchBillingInfo])

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
                {[...Array(3)].map((_, j) => (
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
      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Dados pessoais utilizados para cobrança
              </CardDescription>
            </div>
            <Dialog open={editingPersonal} onOpenChange={setEditingPersonal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Informações Pessoais</DialogTitle>
                  <DialogDescription>
                    Atualize seus dados pessoais de cobrança
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={personalForm.name}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalForm.email}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="document">CPF/CNPJ</Label>
                    <Input
                      id="document"
                      value={personalForm.document}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, document: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingPersonal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={savePersonalInfo} disabled={savingPersonal}>
                    {savingPersonal ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {billingInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{billingInfo.name}</p>
                  <p className="text-xs text-gray-500">Nome</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{billingInfo.email}</p>
                  <p className="text-xs text-gray-500">E-mail</p>
                </div>
              </div>
              {billingInfo.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{formatPhone(billingInfo.phone)}</p>
                    <p className="text-xs text-gray-500">Telefone</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    {billingInfo.documentType === 'CPF' 
                      ? formatCPF(billingInfo.document)
                      : formatCNPJ(billingInfo.document)
                    }
                  </p>
                  <p className="text-xs text-gray-500">{billingInfo.documentType}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma informação pessoal cadastrada</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setEditingPersonal(true)}
              >
                Adicionar Informações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endereço de Cobrança */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço de Cobrança
              </CardTitle>
              <CardDescription>
                Endereço utilizado para emissão de notas fiscais
              </CardDescription>
            </div>
            <Dialog open={editingAddress} onOpenChange={setEditingAddress}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  {billingInfo?.address ? 'Editar' : 'Adicionar'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Endereço de Cobrança</DialogTitle>
                  <DialogDescription>
                    Informe o endereço para emissão de notas fiscais
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={addressForm.zipCode}
                      onChange={(e) => {
                        const cep = e.target.value.replace(/\D/g, '')
                        setAddressForm(prev => ({ ...prev, zipCode: cep }))
                        if (cep.length === 8) {
                          fetchAddressByCEP(cep)
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={8}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor="state">Estado</Label>
                    <select
                      id="state"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      {BRAZILIAN_STATES.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input
                      id="street"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={addressForm.number}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={addressForm.complement}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, complement: e.target.value }))}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={addressForm.neighborhood}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Nome da cidade"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingAddress(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={saveAddress} disabled={savingAddress}>
                    {savingAddress ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {billingInfo?.address ? (
            <div className="space-y-2">
              <p className="text-sm">
                {billingInfo.address.street}, {billingInfo.address.number}
                {billingInfo.address.complement && `, ${billingInfo.address.complement}`}
              </p>
              <p className="text-sm">
                {billingInfo.address.neighborhood} - {billingInfo.address.city}/{billingInfo.address.state}
              </p>
              <p className="text-sm">
                CEP: {formatCEP(billingInfo.address.zipCode)}
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum endereço cadastrado</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setEditingAddress(true)}
              >
                Adicionar Endereço
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métodos de Pagamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Métodos de Pagamento
              </CardTitle>
              <CardDescription>
                Cartões salvos para facilitar pagamentos futuros
              </CardDescription>
            </div>
            <Dialog open={addingPaymentMethod} onOpenChange={setAddingPaymentMethod}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cartão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Método de Pagamento</DialogTitle>
                  <DialogDescription>
                    Adicione um cartão para facilitar pagamentos futuros
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                    <Input
                      id="cardNumber"
                      value={paymentMethodForm.cardNumber}
                      onChange={(e) => setPaymentMethodForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holderName">Nome no Cartão</Label>
                    <Input
                      id="holderName"
                      value={paymentMethodForm.holderName}
                      onChange={(e) => setPaymentMethodForm(prev => ({ ...prev, holderName: e.target.value }))}
                      placeholder="Nome como está no cartão"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiryMonth">Mês</Label>
                      <Input
                        id="expiryMonth"
                        value={paymentMethodForm.expiryMonth}
                        onChange={(e) => setPaymentMethodForm(prev => ({ ...prev, expiryMonth: e.target.value }))}
                        placeholder="MM"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiryYear">Ano</Label>
                      <Input
                        id="expiryYear"
                        value={paymentMethodForm.expiryYear}
                        onChange={(e) => setPaymentMethodForm(prev => ({ ...prev, expiryYear: e.target.value }))}
                        placeholder="AAAA"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        value={paymentMethodForm.cvv}
                        onChange={(e) => setPaymentMethodForm(prev => ({ ...prev, cvv: e.target.value }))}
                        placeholder="000"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="h-4 w-4" />
                    Seus dados são criptografados e seguros
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddingPaymentMethod(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={addPaymentMethod} disabled={savingPaymentMethod}>
                    {savingPaymentMethod ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {billingInfo.paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {CARD_BRANDS[method.brand as keyof typeof CARD_BRANDS] || method.brand} •••• {method.lastFourDigits}
                        </p>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {method.holderName} • Expira {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultPaymentMethod(method.id)}
                      >
                        Definir como Padrão
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Método de Pagamento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removePaymentMethod(method.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum método de pagamento cadastrado</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setAddingPaymentMethod(true)}
              >
                Adicionar Cartão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}