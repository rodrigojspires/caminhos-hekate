'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MoreHorizontal, Edit, Copy, Trash2, Eye, ExternalLink } from 'lucide-react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice?: number | null
  stock: number
  active: boolean
}

export interface ProductTableProduct {
  id: string
  name: string
  slug: string
  description?: string
  type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'
  // preços vêm da primeira variação
  variants: ProductVariant[]
  sku?: string
  active: boolean
  featured: boolean
  images: string[]
  category?: {
    id: string
    name: string
    slug: string
  }
  _count: {
    orderItems: number
    variants: number
  }
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ProductTableProps {
  products: ProductTableProduct[]
  loading: boolean
  pagination: Pagination
  onPageChange: (page: number) => void
  onDeleteProduct: (productId: string) => void
  onDuplicateProduct: (productId: string) => void
  onEditProduct: (productId: string) => void
}

const statusConfig = {
  ACTIVE: { label: 'Ativo', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inativo', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
  OUT_OF_STOCK: { label: 'Fora de Estoque', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
} as const

const typeConfig = {
  PHYSICAL: { label: 'Físico', color: 'bg-blue-100 text-blue-800' },
  DIGITAL: { label: 'Digital', color: 'bg-purple-100 text-purple-800' },
  SERVICE: { label: 'Serviço', color: 'bg-orange-100 text-orange-800' },
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function ProductTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductTable({
  products,
  loading,
  pagination,
  onPageChange,
  onDeleteProduct,
  onDuplicateProduct,
  onEditProduct,
}: ProductTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<ProductTableProduct | null>(null)

  const handleDeleteClick = (product: ProductTableProduct) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id)
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  if (loading) {
    return <ProductTableSkeleton />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            {pagination.total} produto{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum produto encontrado
              </p>
              <Button onClick={() => window.location.href = '/admin/products/new'}>
                Criar primeiro produto
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Imagem</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                            {product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                                Sem imagem
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{product.name}</p>
                              {product.featured && (
                                <Badge variant="outline" className="text-xs">
                                  Destaque
                                </Badge>
                              )}
                            </div>
                            {product.sku && (
                              <p className="text-sm text-muted-foreground">
                                SKU: {product.sku}
                              </p>
                            )}
                            {product._count.variants > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {product._count.variants} variante{product._count.variants !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Sem categoria
                            </span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {(() => {
                            const tcfg = typeConfig[product.type as keyof typeof typeConfig] || typeConfig.DIGITAL
                            return (
                              <Badge 
                                variant="outline" 
                                className={tcfg.color}
                              >
                                {tcfg.label}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        
                        <TableCell>
                          {(() => {
                            const list = product.variants || []
                            const main = list.find((v: any) => (v as any).attributes?.primary) || list[0]
                            const price = main?.price != null ? Number(main.price) : undefined
                            const compare = main?.comparePrice != null ? Number(main.comparePrice) : undefined
                            return (
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {price != null ? formatPrice(price) : '—'}
                                </p>
                                {compare != null && price != null && compare > price && (
                                  <p className="text-sm text-muted-foreground line-through">
                                    {formatPrice(compare)}
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        
                        <TableCell>
                          {(() => {
                            const cfg = product.active ? statusConfig.ACTIVE : statusConfig.INACTIVE
                            const toggle = async () => {
                              try {
                                const res = await fetch(`/api/admin/products/${product.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ active: !product.active })
                                })
                                if (!res.ok) throw new Error('Falha ao atualizar status')
                                toast.success(`Produto ${!product.active ? 'ativado' : 'desativado'}`)
                                // Recarregar a página atual da listagem
                                onPageChange(pagination.page)
                              } catch (e) {
                                toast.error('Não foi possível alterar o status')
                              }
                            }
                            return (
                              <button onClick={toggle} title="Alternar ativo/inativo" className="cursor-pointer">
                                <Badge variant={cfg.variant} className={cfg.color}>
                                  {cfg.label}
                                </Badge>
                              </button>
                            )
                          })()}
                        </TableCell>
                        
                        <TableCell>
                          <p className="text-sm">
                            {product._count.orderItems} venda{product._count.orderItems !== 1 ? 's' : ''}
                          </p>
                        </TableCell>
                        
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(product.createdAt)}
                          </p>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(product.id)}
                              >
                                Copiar ID
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => window.open(`/loja/${product.slug}`, '_blank')}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver na Loja
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => onEditProduct(product.id)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => onDuplicateProduct(product.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(product)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} produto{pagination.total !== 1 ? 's' : ''}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = pagination.page - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o produto &ldquo;{productToDelete?.name}&rdquo;?
              Esta ação não pode ser desfeita.
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
    </>
  )
}
