'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'
import {
  Package,
  User,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Edit,
  Download,
  RefreshCw,
  ShoppingCart,
  Tag,
  Clock,
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
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

interface OrderDetailsProps {
  order: Order
  onRefresh?: () => void
  onExport?: () => void
  loading?: boolean
  compact?: boolean
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const statusIcons = {
  PENDING: Clock,
  PROCESSING: RefreshCw,
  SHIPPED: Package,
  DELIVERED: Package,
  CANCELLED: Package,
}

export function OrderDetails({
  order,
  onRefresh,
  onExport,
  loading = false,
  compact = false,
}: OrderDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  }

  const formatDateLong = (date: string) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
  }

  const StatusIcon = statusIcons[order.status]

  const handleExport = () => {
    if (onExport) {
      onExport()
      return
    }

    // Exportação padrão
    const csvContent = [
      ['Campo', 'Valor'].join(','),
      ['ID do Pedido', order.id],
      ['Cliente', `"${order.user.name}"`],
      ['Email', order.user.email],
      ['Status', statusLabels[order.status]],
      ['Total', order.total.toFixed(2)],
      ['Data do Pedido', formatDate(order.createdAt)],
      ['Última Atualização', formatDate(order.updatedAt)],
      [''],
      ['Itens do Pedido'],
      ['Produto', 'SKU', 'Categoria', 'Quantidade', 'Preço Unitário', 'Subtotal'].join(','),
      ...order.orderItems.map(item => [
        `"${item.product.name}"`,
        item.product.sku,
        `"${item.product.category.name}"`,
        item.quantity,
        item.price.toFixed(2),
        (item.quantity * item.price).toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedido-${order.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Pedido #{order.id.slice(-8)}</CardTitle>
                <CardDescription>{formatDate(order.createdAt)}</CardDescription>
              </div>
            </div>
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(order.total)}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{order.stats.totalItems}</div>
              <div className="text-sm text-muted-foreground">Itens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{order.stats.totalProducts}</div>
              <div className="text-sm text-muted-foreground">Produtos</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={order.user.image} />
              <AvatarFallback className="text-xs">
                {order.user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">{order.user.name}</div>
              <div className="text-xs text-muted-foreground">{order.user.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Pedido */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Pedido #{order.id.slice(-8)}</CardTitle>
                <CardDescription className="text-base">
                  Criado em {formatDateLong(order.createdAt)}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Atualizar dados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exportar detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Badge className={`${statusColors[order.status]} text-sm px-3 py-1`}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Resumo do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de Itens</span>
                <span className="font-medium">{order.stats.totalItems}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Produtos Únicos</span>
                <span className="font-medium">{order.stats.totalProducts}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Preço Médio</span>
                <span className="font-medium">{formatCurrency(order.stats.averageItemPrice)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Total do Pedido</span>
                <span className="text-xl font-bold">{formatCurrency(order.total)}</span>
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
                  Cliente desde {format(new Date(order.user.createdAt), 'MMM yyyy', { locale: ptBR })}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.user.email}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {order.user.subscription}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronologia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Pedido Criado</div>
                <div className="text-sm text-muted-foreground">
                  {formatDateLong(order.createdAt)}
                </div>
              </div>
              
              {order.updatedAt !== order.createdAt && (
                <div>
                  <div className="text-sm font-medium">Última Atualização</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateLong(order.updatedAt)}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-sm font-medium">Status Atual</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusIcon className="h-4 w-4" />
                  <span className="text-sm">{statusLabels[order.status]}</span>
                </div>
              </div>
            </div>
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
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
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
                  <TableCell className="text-right font-medium">
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
          
          <div className="mt-6 flex justify-end">
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">Total do Pedido</div>
              <div className="text-3xl font-bold">
                {formatCurrency(order.total)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}