import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { buildOrderStatusEmail, ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/shop/orderStatusNotifications'
import { notifyUsers } from '@/lib/notifications'

// Schema de validação para atualização de pedido
const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  trackingInfo: z
    .union([
      z.string().trim().max(255, 'O rastreio deve ter no máximo 255 caracteres'),
      z.literal(null),
    ])
    .optional(),
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado foi enviado para atualização' },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {}

    if (data.status) {
      updatePayload.status = data.status
    }

    if (Object.prototype.hasOwnProperty.call(data, 'trackingInfo')) {
      if (typeof data.trackingInfo === 'string') {
        updatePayload.trackingInfo = data.trackingInfo.length > 0 ? data.trackingInfo : null
      } else {
        updatePayload.trackingInfo = null
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado válido foi enviado para atualização' },
        { status: 400 }
      )
    }
    
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
    
    const statusChanged = data.status && data.status !== existingOrder.status
    const trackingProvided = Object.prototype.hasOwnProperty.call(data, 'trackingInfo')

    
    // Atualizar pedido
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...updatePayload,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subscriptionTier: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                slug: true,
                shortDescription: true,
                type: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  }
                },
              }
            }
          }
        }
      }
    })
    
    const stats = {
      totalItems: updatedOrder.items.reduce((sum, item) => sum + item.quantity, 0),
      totalProducts: updatedOrder.items.length,
      averageItemPrice: updatedOrder.items.length > 0
        ? updatedOrder.items.reduce((sum, item) => sum + Number(item.price), 0) / updatedOrder.items.length
        : 0,
    }
    
    const hasTrackingAfterUpdate = typeof updatedOrder.trackingInfo === 'string' && updatedOrder.trackingInfo.trim().length > 0
    const statusForNotifications = (data.status as OrderStatus) || (updatedOrder.status as OrderStatus)

    const shouldSendStatusEmail = statusChanged && data.status
      ? !(data.status === 'SHIPPED' && !hasTrackingAfterUpdate)
      : false
    const shouldSendTrackingEmail = !statusChanged && trackingProvided && hasTrackingAfterUpdate && updatedOrder.status === 'SHIPPED'
    const shouldSendEmail = shouldSendStatusEmail || shouldSendTrackingEmail

    if (shouldSendEmail) {
      const recipient = updatedOrder.user?.email ?? updatedOrder.customerEmail
      if (recipient) {
        const emailContent = buildOrderStatusEmail(statusForNotifications, {
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName ?? updatedOrder.user?.name ?? null,
          trackingInfo: updatedOrder.trackingInfo,
        })
        if (emailContent) {
          try {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              toEmail: recipient,
              subject: emailContent.subject,
              htmlContent: emailContent.htmlContent,
              textContent: emailContent.textContent,
              priority: 'NORMAL',
            } as any)
          } catch (error) {
            console.error('Erro ao enviar e-mail de atualização de pedido:', error)
          }
        }
      }

      if (updatedOrder.user?.id) {
        const statusLabel = ORDER_STATUS_LABELS[statusForNotifications] || statusForNotifications
        const trackingSnippet = hasTrackingAfterUpdate
          ? updatedOrder.trackingInfo!.startsWith('http')
            ? ` Acompanhe em ${updatedOrder.trackingInfo}.`
            : ` Código de rastreio: ${updatedOrder.trackingInfo}.`
          : ''
        try {
          await notifyUsers({
            userId: updatedOrder.user.id,
            type: 'ORDER_STATUS',
            title: `Status do pedido ${updatedOrder.orderNumber}`,
            content: `Seu pedido agora está em "${statusLabel}".${trackingSnippet}`,
            metadata: {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              status: statusForNotifications,
              trackingInfo: updatedOrder.trackingInfo ?? null,
            },
          })
        } catch (notificationError) {
          console.error('Erro ao criar notificação de status de pedido:', notificationError)
        }
      }
    }
    
    return NextResponse.json({
      message: 'Pedido atualizado com sucesso',
      order: {
        ...updatedOrder,
        stats,
      }
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
        items: true,
        couponUsages: true,
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
    
    await prisma.$transaction(async (tx) => {
      if (existingOrder.couponUsages.length > 0) {
        const couponIds = existingOrder.couponUsages.reduce<Record<string, number>>((acc, usage) => {
          acc[usage.couponId] = (acc[usage.couponId] || 0) + 1
          return acc
        }, {})

        await tx.couponUsage.deleteMany({ where: { orderId: id } })

        for (const [couponId, count] of Object.entries(couponIds)) {
          const updated = await tx.coupon.update({
            where: { id: couponId },
            data: {
              usageCount: {
                decrement: count,
              },
            },
          })

          if (updated.usageCount < 0) {
            await tx.coupon.update({
              where: { id: couponId },
              data: { usageCount: 0 },
            })
          }
        }
      }

      await tx.order.delete({
        where: { id },
      })
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
