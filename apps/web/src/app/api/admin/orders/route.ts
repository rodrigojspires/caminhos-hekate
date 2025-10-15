import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth-middleware'
import { buildOrderStatusEmail, type OrderStatus } from '@/lib/shop/orderStatusNotifications'

// Schema de validação para filtros
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minTotal: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  maxTotal: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  sortBy: z.enum(['id', 'total', 'status', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Schema de validação para atualização de status
const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
})

// GET /api/admin/orders - Listar pedidos
export const GET = withAdminAuth(async (user, request: NextRequest) => {
  
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))
    
    // Construir filtros
    const where: any = {}
    
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ]
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.userId) {
      where.userId = query.userId
    }
    
    if (query.startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(query.startDate)
      }
    }
    
    if (query.endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(query.endDate)
      }
    }
    
    if (query.minTotal !== undefined) {
      where.total = {
        ...where.total,
        gte: query.minTotal
      }
    }
    
    if (query.maxTotal !== undefined) {
      where.total = {
        ...where.total,
        lte: query.maxTotal
      }
    }
    
    // Contar total de pedidos
    const total = await prisma.order.count({ where })
    
    // Buscar pedidos com paginação
    const orders = await prisma.order.findMany({
      where,
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
                images: true,
              }
            }
          }
        },
        _count: {
          select: {
            items: true,
          }
        }
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })
    
    const totalPages = Math.ceil(total / query.limit)
    
    return NextResponse.json({
      orders,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// PATCH /api/admin/orders - Atualizar status de múltiplos pedidos
export const PATCH = withAdminAuth(async (user, request: NextRequest) => {
  
  try {
    const body = await request.json()
    const { orderIds, status } = body
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs dos pedidos são obrigatórios' },
        { status: 400 }
      )
    }
    
    const statusData = updateStatusSchema.parse({ status })
    const statusToApply = statusData.status as OrderStatus
    
    const ordersBeforeUpdate = await prisma.order.findMany({
      where: {
        id: {
          in: orderIds,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerEmail: true,
        customerName: true,
        trackingInfo: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })
    
    // Atualizar status dos pedidos
    const updatedOrders = await prisma.order.updateMany({
      where: {
        id: {
          in: orderIds
        }
      },
      data: {
        status: statusToApply,
        updatedAt: new Date()
      }
    })
    
    const ordersToNotify = ordersBeforeUpdate.filter((order) => order.status !== statusToApply)
    if (ordersToNotify.length > 0) {
      try {
        const { sendEmail } = await import('@/lib/email')
        for (const order of ordersToNotify) {
          const recipient = order.user?.email ?? order.customerEmail
          if (!recipient) continue
          const emailContent = buildOrderStatusEmail(statusToApply, {
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? order.user?.name ?? null,
            trackingInfo: order.trackingInfo,
          })
          if (!emailContent) continue
          try {
            await sendEmail({
              toEmail: recipient,
              subject: emailContent.subject,
              htmlContent: emailContent.htmlContent,
              textContent: emailContent.textContent,
              priority: 'NORMAL',
            } as any)
          } catch (emailError) {
            console.error(`Erro ao enviar e-mail de atualização para o pedido ${order.id}:`, emailError)
          }
        }
      } catch (error) {
        console.error('Erro ao preparar envio de e-mails de atualização de pedidos:', error)
      }
    }
    
    return NextResponse.json({
      message: `${updatedOrders.count} pedidos atualizados com sucesso`,
      updatedCount: updatedOrders.count
    })
    
  } catch (error) {
    console.error('Erro ao atualizar pedidos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
