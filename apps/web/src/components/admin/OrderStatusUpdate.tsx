'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Clock,
  RefreshCw,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Save,
  CreditCard,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

interface OrderStatusUpdateProps {
  orderId: string
  currentStatus: OrderStatus
  onStatusUpdate: (orderId: string, status: OrderStatus, note?: string) => Promise<void>
  disabled?: boolean
  showHistory?: boolean
  compact?: boolean
}

const statusConfig = {
  PENDING: {
    label: 'Aguardando pagamento',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Pedido aguardando confirmação do pagamento.',
  },
  PAID: {
    label: 'Pagamento efetuado',
    icon: CreditCard,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Pagamento confirmado. Pedido aguardando preparação.',
  },
  PROCESSING: {
    label: 'Aguardando envio',
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Pedido sendo preparado para envio.',
  },
  SHIPPED: {
    label: 'Enviado',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Pedido enviado e em transporte.',
  },
  DELIVERED: {
    label: 'Concluído',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Pedido entregue ao cliente.',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Pedido cancelado.',
  },
  REFUNDED: {
    label: 'Reembolsado',
    icon: History,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Valor devolvido ao cliente.',
  },
} as const

const statusFlow: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

const statusWarnings: Record<string, string> = {
  'PAID->CANCELLED': 'Confirme que o estorno do pagamento será realizado.',
  'PROCESSING->CANCELLED': 'Confirme se o pedido pode ser cancelado sem custos adicionais.',
  'SHIPPED->CANCELLED': 'Cancelar um pedido enviado pode gerar custos de logística reversa.',
  'DELIVERED->CANCELLED': 'Cancelar após entrega pode exigir logística reversa e estorno.',
  'PAID->REFUNDED': 'Garanta que o reembolso foi processado junto ao meio de pagamento.',
  'SHIPPED->REFUNDED': 'Confirme a devolução dos produtos antes do reembolso.',
  'DELIVERED->REFUNDED': 'Certifique-se de que o cliente devolveu o produto antes do reembolso.',
}

export function OrderStatusUpdate({
  orderId,
  currentStatus,
  onStatusUpdate,
  disabled = false,
  showHistory = false,
  compact = false,
}: OrderStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus)
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<{
    status: OrderStatus
    note: string
  } | null>(null)

  const currentConfig = statusConfig[currentStatus]
  const CurrentIcon = currentConfig.icon

  const availableStatuses = [
    currentStatus,
    ...statusFlow[currentStatus],
  ]

  const handleStatusChange = (newStatus: OrderStatus) => {
    setSelectedStatus(newStatus)
    
    // Se é o mesmo status, não precisa de confirmação
    if (newStatus === currentStatus) {
      return
    }
    
    // Verificar se precisa de confirmação especial
    const warningKey = `${currentStatus}->${newStatus}`
    if (statusWarnings[warningKey] || newStatus === 'CANCELLED') {
      setPendingUpdate({ status: newStatus, note })
      setConfirmDialogOpen(true)
    } else {
      handleUpdate(newStatus, note)
    }
  }

  const handleUpdate = async (status: OrderStatus, updateNote: string) => {
    try {
      setUpdating(true)
      await onStatusUpdate(orderId, status, updateNote)
      setNote('')
      toast.success(`Status atualizado para ${statusConfig[status].label}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status do pedido')
      setSelectedStatus(currentStatus) // Reverter seleção
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmUpdate = () => {
    if (pendingUpdate) {
      handleUpdate(pendingUpdate.status, pendingUpdate.note)
      setPendingUpdate(null)
      setConfirmDialogOpen(false)
    }
  }

  const progressStatuses: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']

  const getStatusProgress = () => {
    if (currentStatus === 'CANCELLED') {
      return -1
    }

    if (currentStatus === 'REFUNDED') {
      return progressStatuses.length
    }

    return progressStatuses.indexOf(currentStatus)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={selectedStatus}
          onValueChange={handleStatusChange}
          disabled={disabled || updating}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              <div className="flex items-center gap-2">
                <CurrentIcon className="h-4 w-4" />
                <span>{currentConfig.label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => {
              const config = statusConfig[status]
              const Icon = config.icon
              return (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        
        {updating && (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CurrentIcon className="h-5 w-5" />
          Status do Pedido
        </CardTitle>
        <CardDescription>
          Atualize o status do pedido conforme o progresso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Atual */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            <CurrentIcon className="h-6 w-6" />
            <div>
              <div className="font-medium">{currentConfig.label}</div>
              <div className="text-sm text-muted-foreground">
                {currentConfig.description}
              </div>
            </div>
          </div>
          <Badge className={currentConfig.color}>
            {currentConfig.label}
          </Badge>
        </div>

        {/* Progresso Visual */}
        {getStatusProgress() >= 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Progresso do Pedido</Label>
            <div className="flex items-center gap-2">
              {progressStatuses.map((status, index) => {
                const config = statusConfig[status as OrderStatus]
                const Icon = config.icon
                const isActive = index <= getStatusProgress()
                const isCurrent = status === currentStatus
                
                return (
                  <TooltipProvider key={status}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <div
                            className={`p-2 rounded-full border-2 ${
                              isActive
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                            } ${
                              isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          {index < progressStatuses.length - 1 && (
                            <div
                              className={`w-8 h-0.5 ${
                                index < getStatusProgress()
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/20'
                              }`}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{config.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
        )}

        {/* Seleção de Novo Status */}
        <div className="space-y-3">
          <Label htmlFor="status-select">Atualizar Status</Label>
          <Select
            value={selectedStatus}
            onValueChange={handleStatusChange}
            disabled={disabled || updating}
          >
            <SelectTrigger id="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => {
                const config = statusConfig[status]
                const Icon = config.icon
                return (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div>{config.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Nota da Atualização */}
        {selectedStatus !== currentStatus && (
          <div className="space-y-3">
            <Label htmlFor="update-note">Nota da Atualização (Opcional)</Label>
            <Textarea
              id="update-note"
              placeholder="Adicione uma nota sobre esta atualização de status..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={disabled || updating}
              rows={3}
            />
          </div>
        )}

        {/* Avisos */}
        {selectedStatus !== currentStatus && (
          <div className="space-y-2">
            {statusWarnings[`${currentStatus}->${selectedStatus}`] && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  {statusWarnings[`${currentStatus}->${selectedStatus}`]}
                </div>
              </div>
            )}
            
            {selectedStatus === 'CANCELLED' && currentStatus !== 'CANCELLED' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  Cancelar este pedido pode afetar métricas de vendas e satisfação do cliente.
                </div>
              </div>
            )}

            {selectedStatus === 'REFUNDED' && currentStatus !== 'REFUNDED' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <History className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-800">
                  Certifique-se de registrar o reembolso no gateway de pagamento e notificar o cliente.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        {selectedStatus !== currentStatus && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => handleStatusChange(selectedStatus)}
              disabled={disabled || updating}
              className="flex items-center gap-2"
            >
              {updating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updating ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStatus(currentStatus)
                setNote('')
              }}
              disabled={disabled || updating}
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização de Status</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                Você está prestes a alterar o status do pedido de{' '}
                <strong>{statusConfig[currentStatus].label}</strong> para{' '}
                <strong>{pendingUpdate && statusConfig[pendingUpdate.status].label}</strong>.
              </div>
              
              {pendingUpdate && statusWarnings[`${currentStatus}->${pendingUpdate.status}`] && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  {statusWarnings[`${currentStatus}->${pendingUpdate.status}`]}
                </div>
              )}
              
              <div className="text-sm">
                Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedStatus(currentStatus)
                setPendingUpdate(null)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdate}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar Atualização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
