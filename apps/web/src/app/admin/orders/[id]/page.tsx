'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Download,
  RefreshCw,
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

import { Breadcrumbs } from '@/components/admin/Breadcrumbs'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    description: string
    images: string[]
    sku: string
    price: number
    category: {
      id: string
      name: string
      slug: string
    }
  }
}

interface Order {
  id: string
  total: number
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    image?: string
    subscription: string
    createdAt: string
  }
  orderItems: OrderItem[]
  stats: {
    totalItems: number
    totalProducts: number
    averageItemPrice: number
  }
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusLabels = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

interface OrderDetailsPageProps {
  params: {
    id: string
  }
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Buscar detalhes do pedido
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar pedido')
      }

      setOrder(data.order)
    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      toast.error('Erro ao carregar pedido')
      router.push('/admin/orders')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  // Atualizar status do pedido
  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status')
      }

      setOrder(data.order)
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdating(false)
    }
  }

  // Deletar pedido
  const handleDeleteOrder = async () => {
    if (!order) return

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar pedido')
      }

      toast.success('Pedido deletado com sucesso')
      router.push('/admin/orders')
    } catch (error) {
      console.error('Erro ao deletar pedido:', error)
      toast.error('Erro ao deletar pedido')
    }
  }

  // Exportar detalhes do pedido
  const handleExport = () => {
    if (!order) return

    const csvContent = [
      ['Campo', 'Valor'].join(','),
      ['ID do Pedido', order.id],
      ['Cliente', `"${order.user.name}"`],
      ['Email', order.user.email],
      ['Status', statusLabels[order.status]],
      ['Total', order.total.toFixed(2)],
      ['Data do Pedido', new Date(order.createdAt).toLocaleDateString('pt-BR')],
      ['Última Atualização', new Date(order.updatedAt).toLocaleDateString('pt-BR')],
      [''],
      ['Itens do Pedido'],
      ['Produto', 'SKU', 'Quantidade', 'Preço Unitário', 'Subtotal'].join(','),
      ...order.orderItems.map(item => [
        `"${item.product.name}"`,
        item.product.sku,
        item.quantity,
        item.price.toFixed(2),
        (item.quantity * item.price).toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedido-${order.id}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast.success('Detalhes do pedido exportados')
  }

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Pedido não encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          O pedido solicitado não foi encontrado.
        </p>
        <Button
          className="mt-4"
          onClick={() => router.push('/admin/orders')}
        >
          Voltar para pedidos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Pedidos', href: '/admin/orders' },
          { label: `Pedido #${order.id.slice(-8)}`, href: `/admin/orders/${order.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Pedido #{order.id.slice(-8)}
            </h1>
            <p className="text-muted-foreground">
              Criado em {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrder}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!['PENDING', 'CANCELLED'].includes(order.status)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informações do Pedido */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Select
                    value={order.status}
                    onValueChange={handleStatusUpdate}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="PROCESSING">Processando</SelectItem>
                      <SelectItem value="SHIPPED">Enviado</SelectItem>
                      <SelectItem value="DELIVERED">Entregue</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total</label>
                <div className="mt-1 text-2xl font-bold">
                  {formatCurrency(order.total)}
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total de Itens</label>
                <div className="mt-1 text-lg font-semibold">
                  {order.stats.totalItems}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Produtos Únicos</label>
                <div className="mt-1 text-lg font-semibold">
                  {order.stats.totalProducts}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preço Médio</label>
                <div className="mt-1 text-lg font-semibold">
                  {formatCurrency(order.stats.averageItemPrice)}
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data do Pedido</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(order.createdAt)}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(order.updatedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={order.user.image} />
                <AvatarFallback>
                  {order.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{order.user.name}</div>
                <div className="text-sm text-muted-foreground">
                  Cliente desde {new Date(order.user.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.user.email}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{order.user.subscription}</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/admin/users/${order.user.id}`)}
            >
              Ver perfil do cliente
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Itens do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
          <CardDescription>
            {order.orderItems.length} {order.orderItems.length === 1 ? 'item' : 'itens'} neste pedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço Unitário</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.orderItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.product.images.length > 0 && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {item.product.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.product.sku}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.product.category.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total do Pedido</div>
              <div className="text-2xl font-bold">
                {formatCurrency(order.total)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este pedido? Esta ação não pode ser desfeita.
              Apenas pedidos pendentes ou cancelados podem ser deletados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
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