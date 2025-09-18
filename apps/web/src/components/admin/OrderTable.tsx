'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Package,
  User,
  Calendar,
  DollarSign,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

import { Pagination } from './Pagination'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    sku: string
    price: number
  }
}

interface Order {
  id: string
  total: number
  status:
    | 'PENDING'
    | 'PAID'
    | 'PROCESSING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'REFUNDED'
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string
    email: string
    image?: string
    subscription?: string | null
  } | null
  orderItems: OrderItem[]
  _count: {
    orderItems: number
  }
}

interface OrderTableProps {
  orders: Order[]
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  onStatusUpdate: (orderId: string, status: string) => Promise<void>
  onDelete: (orderId: string) => Promise<void>
  onExport: () => void
  loading?: boolean
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  REFUNDED: 'bg-slate-100 text-slate-700 border-slate-200',
} as const

const statusLabels = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pagamento efetuado',
  PROCESSING: 'Aguardando envio',
  SHIPPED: 'Enviado',
  DELIVERED: 'Concluído',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
} as const

export function OrderTable({
  orders,
  totalPages,
  currentPage,
  onPageChange,
  onStatusUpdate,
  onDelete,
  onExport,
  loading = false,
}: OrderTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const canCancel = (status: Order['status']) => !['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(status)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  }

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    try {
      setUpdatingStatus(order.id)
      await onStatusUpdate(order.id, newStatus)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDeleteClick = (order: Order) => {
    setSelectedOrder(order)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedOrder) {
      await onDelete(selectedOrder.id)
      setDeleteDialogOpen(false)
      setSelectedOrder(null)
    }
  }

  const getTotalItems = (order: Order) => {
    return order.orderItems.reduce((total, item) => total + item.quantity, 0)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum pedido encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Não há pedidos que correspondam aos filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const customerName = order.user?.name ?? 'Cliente'
              const customerEmail = order.user?.email ?? '—'

              return (
                <TableRow key={order.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium font-mono text-sm">
                      #{order.id.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTotalItems(order)} {getTotalItems(order) === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {order.user?.image ? (
                        <AvatarImage src={order.user.image} alt={customerName} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {customerName
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {customerEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusUpdate(order, value)}
                    disabled={updatingStatus === order.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        <Badge
                          variant="outline"
                          className={statusColors[order.status]}
                        >
                          {statusLabels[order.status]}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Aguardando pagamento</SelectItem>
                      <SelectItem value="PAID">Pagamento efetuado</SelectItem>
                      <SelectItem value="PROCESSING">Aguardando envio</SelectItem>
                      <SelectItem value="SHIPPED">Enviado</SelectItem>
                      <SelectItem value="DELIVERED">Concluído</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {order._count.orderItems} {order._count.orderItems === 1 ? 'produto' : 'produtos'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTotalItems(order)} {getTotalItems(order) === 1 ? 'unidade' : 'unidades'}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="font-medium">
                    {formatCurrency(order.total)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">
                      {formatDate(order.createdAt)}
                    </div>
                    {order.updatedAt !== order.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        Atualizado: {formatDate(order.updatedAt)}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!canCancel(order.status)) return
                          const confirmed = window.confirm('Tem certeza que deseja cancelar este pedido?')
                          if (!confirmed) return
                          handleStatusUpdate(order, 'CANCELLED')
                        }}
                        disabled={updatingStatus === order.id || !canCancel(order.status)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar pedido
                      </DropdownMenuItem>
                      
                      {order.user?.id ? (
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${order.user.id}`}>
                            <User className="mr-2 h-4 w-4" />
                            Ver cliente
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem
                        onClick={() => {
                          const csvContent = [
                            ['ID', 'Cliente', 'Email', 'Status', 'Total', 'Itens', 'Data'].join(','),
                            [
                              order.id,
                              `"${customerName}"`,
                              customerEmail,
                              statusLabels[order.status],
                              order.total.toFixed(2),
                              getTotalItems(order),
                              formatDate(order.createdAt),
                            ].join(','),
                          ].join('\n')

                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                          const link = document.createElement('a')
                          link.href = URL.createObjectURL(blob)
                          link.download = `pedido-${order.id.slice(-8)}.csv`
                          link.click()
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(order)}
                        disabled={!['PENDING', 'CANCELLED'].includes(order.status)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={orders.length}
          itemsPerPage={10}
          onPageChange={onPageChange}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o pedido #{selectedOrder?.id.slice(-8)}?
              Esta ação não pode ser desfeita. Apenas pedidos pendentes ou cancelados podem ser deletados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
