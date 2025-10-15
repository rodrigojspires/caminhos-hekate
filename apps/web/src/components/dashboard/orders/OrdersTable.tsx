'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Loader2, PackageSearch, ShoppingBag } from 'lucide-react'

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'

type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

type OrderItem = {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface OrderRow {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: number
  shipping: number
  discount: number
  total: number
  createdAt: string
  updatedAt: string
  trackingInfo?: string | null
  items: OrderItem[]
  payment: {
    id: string
    status: PaymentStatus
    method: string | null
    paidAt: string | null
    createdAt: string
  } | null
  transaction: {
    id: string
    status: TransactionStatus
    provider: string
    providerStatus: string | null
    paymentMethod: string | null
    createdAt: string
    paidAt: string | null
  } | null
}

interface OrdersTableProps {
  orders: OrderRow[]
}

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Aguardando pagamento', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  PAID: { label: 'Pagamento efetuado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  PROCESSING: { label: 'Aguardando envio', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  SHIPPED: { label: 'Enviado', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  DELIVERED: { label: 'Concluído', className: 'bg-green-100 text-green-800 border-green-200' },
  CANCELLED: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  REFUNDED: { label: 'Reembolsado', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState<OrderRow | null>(null)

  const handlePay = async (orderId: string) => {
    try {
      setPayingId(orderId)
      const response = await fetch(`/api/user/orders/${orderId}/pay`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        const message = data?.error || 'Não foi possível iniciar o pagamento'
        toast.error(message)
        return
      }

      toast.success('Link de pagamento gerado. Abrindo em uma nova aba…')
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank')
      }
      router.refresh()
    } catch (error) {
      toast.error('Erro ao iniciar pagamento')
    } finally {
      setPayingId(null)
    }
  }

  const canPay = (status: OrderStatus) => status === 'PENDING'

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        <div>
          Você ainda não possui pedidos na loja.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusCfg = orderStatusConfig[order.status] || orderStatusConfig.PENDING
            const itemNames = order.items.map((item) => item.name)
            const maxPreviewItems = 2
            const preview = itemNames.slice(0, maxPreviewItems).join(', ')
            const remainingItems = Math.max(0, itemNames.length - maxPreviewItems)
            const itemsSummary = itemNames.length === 0
              ? 'Nenhum item registrado'
              : remainingItems > 0
              ? `${preview} e +${remainingItems}`
              : preview

            return (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="font-medium">{order.items.length} item(s)</span>
                    <div className="text-xs text-muted-foreground">{itemsSummary}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusCfg.className}>
                    {statusCfg.label}
                  </Badge>
                  {order.trackingInfo ? (
                    <div className="mt-1 text-xs text-muted-foreground break-all">
                      {order.trackingInfo.startsWith('http') ? (
                        <a
                          href={order.trackingInfo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Acompanhar envio
                        </a>
                      ) : (
                        <>Rastreio: {order.trackingInfo}</>
                      )}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  {canPay(order.status) && (
                    <Button
                      size="sm"
                      onClick={() => handlePay(order.id)}
                      disabled={payingId === order.id}
                    >
                      {payingId === order.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando…
                        </>
                      ) : (
                        'Pagar agora'
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailsOrder(order)
                      setDetailsOpen(true)
                    }}
                  >
                    <PackageSearch className="mr-2 h-4 w-4" />
                    Itens
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        </Table>
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            setDetailsOrder(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {detailsOrder ? `Itens do pedido ${detailsOrder.orderNumber}` : 'Itens do pedido'}
            </DialogTitle>
            {detailsOrder && (
              <DialogDescription>
                Realizado em {formatDateTime(detailsOrder.createdAt)}
              </DialogDescription>
            )}
          </DialogHeader>
          {detailsOrder ? (
            <div className="space-y-4">
              <ScrollArea className="max-h-64 pr-2">
                <div className="space-y-3 text-sm">
                  {detailsOrder.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded border p-3">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="font-semibold">{formatCurrency(item.total)}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {detailsOrder.trackingInfo ? (
                <div className="rounded border border-dashed px-3 py-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Rastreamento:</span>{' '}
                  {detailsOrder.trackingInfo.startsWith('http') ? (
                    <a
                      href={detailsOrder.trackingInfo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Acompanhar envio
                    </a>
                  ) : (
                    <span className="font-mono">{detailsOrder.trackingInfo}</span>
                  )}
                </div>
              ) : null}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(detailsOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete</span>
                  <span>{formatCurrency(detailsOrder.shipping)}</span>
                </div>
                {detailsOrder.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto</span>
                    <span>- {formatCurrency(detailsOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(detailsOrder.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um pedido para visualizar os itens.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
