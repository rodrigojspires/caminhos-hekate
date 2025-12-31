'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  CreditCard,
  Download,
  Eye,
  Filter,
  MoreVertical,
  Receipt,
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Payment {
  id: string
  amount: number
  status: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
  paymentMethod: string
  provider: 'MERCADOPAGO' | 'ASAAS'
  description: string
  invoiceUrl?: string
  receiptUrl?: string
  createdAt: string
  paidAt?: string
  lineItems?: Array<{
    label: string
    amount: number
  }>
  subscription?: {
    id: string
    plan: {
      name: string
    }
  }
}

interface PaymentHistoryProps {
  userId?: string
  className?: string
}

const PAYMENT_STATUS_CONFIG = {
  PAID: {
    label: 'Pago',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600',
  },
  PENDING: {
    label: 'Pendente',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-yellow-600',
  },
  FAILED: {
    label: 'Falhou',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600',
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'secondary' as const,
    icon: XCircle,
    color: 'text-gray-600',
  },
  REFUNDED: {
    label: 'Reembolsado',
    variant: 'outline' as const,
    icon: RefreshCw,
    color: 'text-blue-600',
  },
}

const PAYMENT_METHOD_LABELS = {
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
  PIX: 'PIX',
}

export function PaymentHistory({ userId, className = '' }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  // Buscar histórico de pagamentos
  const fetchPayments = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(methodFilter !== 'all' && { method: methodFilter }),
        ...(dateFilter !== 'all' && { period: dateFilter }),
        ...(userId && { userId }),
      })

      const response = await fetch(`/api/payments/history?${params}`)
      if (!response.ok) throw new Error('Erro ao buscar histórico')

      const data = await response.json()
      setPayments(data.payments || [])
      setTotalPages(data.totalPages || 1)
      setPage(pageNum)
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error)
      toast.error('Erro ao carregar histórico de pagamentos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchTerm, statusFilter, methodFilter, dateFilter, userId])

  // Baixar comprovante
  const downloadReceipt = async (payment: Payment) => {
    try {
      if (payment.receiptUrl) {
        window.open(payment.receiptUrl, '_blank')
      } else {
        const response = await fetch(`/api/payments/${payment.id}/receipt`)
        if (!response.ok) throw new Error('Erro ao gerar comprovante')
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `comprovante-${payment.id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error)
      toast.error('Erro ao baixar comprovante')
    }
  }

  // Visualizar fatura
  const viewInvoice = (payment: Payment) => {
    if (payment.invoiceUrl) {
      window.open(payment.invoiceUrl, '_blank')
    } else {
      toast.error('Fatura não disponível')
    }
  }

  useEffect(() => {
    fetchPayments(1)
  }, [fetchPayments])

  const getStatusIcon = (status: Payment['status']) => {
    const config = PAYMENT_STATUS_CONFIG[status]
    const Icon = config.icon
    return <Icon className={`h-4 w-4 ${config.color}`} />
  }

  const getStatusBadge = (status: Payment['status']) => {
    const config = PAYMENT_STATUS_CONFIG[status]
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    )
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription>
                Visualize todos os seus pagamentos e transações
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPayments(page, true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por ID ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="FAILED">Falhou</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                <SelectItem value="REFUNDED">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Tabela de pagamentos */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum pagamento encontrado
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all'
                  ? 'Tente ajustar os filtros para encontrar pagamentos.'
                  : 'Você ainda não possui histórico de pagamentos.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {format(new Date(payment.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(payment.createdAt), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{payment.description}</span>
                          {payment.subscription && (
                            <span className="text-xs text-gray-500">
                              {payment.subscription.plan.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {PAYMENT_METHOD_LABELS[payment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || payment.paymentMethod}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPayment(payment)
                                setDetailsOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            {payment.status === 'PAID' && (
                              <DropdownMenuItem onClick={() => downloadReceipt(payment)}>
                                <Download className="h-4 w-4 mr-2" />
                                Baixar comprovante
                              </DropdownMenuItem>
                            )}
                            {payment.invoiceUrl && (
                              <DropdownMenuItem onClick={() => viewInvoice(payment)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Ver fatura
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPayments(page - 1)}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPayments(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes do pagamento */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Informações completas sobre a transação
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID da Transação</label>
                  <p className="text-sm font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor</label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Método de Pagamento</label>
                  <p className="text-sm">
                    {PAYMENT_METHOD_LABELS[selectedPayment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || selectedPayment.paymentMethod}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Provedor</label>
                  <p className="text-sm">{selectedPayment.provider}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                  <p className="text-sm">
                    {format(new Date(selectedPayment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
                {selectedPayment.paidAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Pagamento</label>
                    <p className="text-sm">
                      {format(new Date(selectedPayment.paidAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Descrição</label>
                <p className="text-sm mt-1">{selectedPayment.description}</p>
              </div>

              {selectedPayment.lineItems && selectedPayment.lineItems.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Itens da fatura</label>
                  <div className="mt-2 space-y-2">
                    {selectedPayment.lineItems.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedPayment.subscription && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assinatura</label>
                  <p className="text-sm mt-1">{selectedPayment.subscription.plan.name}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                {selectedPayment.status === 'PAID' && (
                  <Button
                    variant="outline"
                    onClick={() => downloadReceipt(selectedPayment)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Comprovante
                  </Button>
                )}
                {selectedPayment.invoiceUrl && (
                  <Button
                    variant="outline"
                    onClick={() => viewInvoice(selectedPayment)}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Ver Fatura
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
