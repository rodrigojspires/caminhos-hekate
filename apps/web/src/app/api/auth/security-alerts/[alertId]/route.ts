import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/security-alerts/[alertId] - Obter detalhes de um alerta específico
export async function GET(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const alert = await prisma.securityAlert.findFirst({
      where: {
        id: params.alertId,
        userId: session.user.id
      }
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alerta não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Erro ao buscar alerta:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/auth/security-alerts/[alertId] - Marcar alerta como resolvido
export async function PATCH(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { status, acknowledged } = body

    const alert = await prisma.securityAlert.findFirst({
      where: {
        id: params.alertId,
        userId: session.user.id
      }
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alerta não encontrado' },
        { status: 404 }
      )
    }

    const updatedAlert = await prisma.securityAlert.update({
      where: { id: params.alertId },
      data: {
        status: status || 'RESOLVED',
        acknowledgedAt: acknowledged !== false ? new Date() : null,
        resolvedAt: status === 'RESOLVED' ? new Date() : null
      }
    })

    return NextResponse.json(updatedAlert)
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/security-alerts/[alertId] - Deletar alerta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const alert = await prisma.securityAlert.findFirst({
      where: {
        id: params.alertId,
        userId: session.user.id
      }
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alerta não encontrado' },
        { status: 404 }
      )
    }

    await prisma.securityAlert.delete({
      where: { id: params.alertId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar alerta:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}