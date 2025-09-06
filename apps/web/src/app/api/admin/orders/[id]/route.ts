import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para atualização de pedido
const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
})

// Verificar se usuário tem permissão de admin
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  if (!['ADMIN', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  
  return null
}

// GET /api/admin/orders/[id] - Buscar pedido por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      )
    }
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subscriptionTier: true,
            createdAt: true,
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }
    
    // Calcular estatísticas do pedido
    const orderStats = {
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalProducts: order.items.length,
      averageItemPrice: order.items.length > 0 
        ? order.items.reduce((sum, item) => sum + Number(item.price), 0) / order.items.length
        : 0,
    }
    
    return NextResponse.json({
      order: {
        ...order,
        stats: orderStats
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/orders/[id] - Atualizar pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { id } = params
    const body = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      )
    }
    
    const data = updateOrderSchema.parse(body)
    
    // Verificar se o pedido existe
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })
    
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }
    
    // Atualizar pedido
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })
    
    return NextResponse.json({
      message: 'Pedido atualizado com sucesso',
      order: updatedOrder
    })
    
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/orders/[id] - Deletar pedido
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      )
    }
    
    // Verificar se o pedido existe
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true
      }
    })
    
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar se o pedido pode ser deletado (apenas pedidos PENDING ou CANCELLED)
    if (!['PENDING', 'CANCELLED'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Apenas pedidos pendentes ou cancelados podem ser deletados' },
        { status: 400 }
      )
    }
    
    // Deletar pedido (os itens serão deletados automaticamente devido ao cascade)
    await prisma.order.delete({
      where: { id }
    })
    
    return NextResponse.json({
      message: 'Pedido deletado com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao deletar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}