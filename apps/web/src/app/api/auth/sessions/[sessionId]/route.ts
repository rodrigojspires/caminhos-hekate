import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams {
  params: {
    sessionId: string
  }
}

// DELETE /api/auth/sessions/[sessionId] - Encerrar sessão específica
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { sessionId } = params

    // Verificar se a sessão pertence ao usuário
    const userSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!userSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Não permitir encerrar a sessão atual
    const currentSessionId = session.user.id || 'current'
    if (sessionId === currentSessionId) {
      return NextResponse.json(
        { error: 'Não é possível encerrar a sessão atual' },
        { status: 400 }
      )
    }

    // Encerrar a sessão (marcar como expirada)
    await prisma.session.update({
      where: {
        id: sessionId
      },
      data: {
        expires: new Date() // Expira imediatamente
      }
    })

    // Registrar no histórico de login
    await prisma.loginHistory.create({
      data: {
        userId: session.user.id,
        userAgent: 'Remote Logout',
        ipAddress: '0.0.0.0',
        location: 'Remote',
        success: true,
        sessionId: sessionId
      }
    })

    return NextResponse.json({ 
      message: 'Sessão encerrada com sucesso' 
    })
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/auth/sessions/[sessionId] - Obter detalhes de uma sessão
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { sessionId } = params

    const userSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        expires: {
          gt: new Date()
        }
      }
    })

    if (!userSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    const currentSessionId = session.user.id || 'current'
    
    const formattedSession = {
      id: userSession.id,
      device: 'Dispositivo Desconhecido', // Campo não existe no modelo Session
      location: 'Localização Desconhecida', // Campo não existe no modelo Session
      ip: '0.0.0.0', // Campo não existe no modelo Session
      lastActive: new Date().toISOString(), // Campo não existe no modelo Session
      createdAt: new Date().toISOString(), // Campo não existe no modelo Session
      expiresAt: userSession.expires.toISOString(),
      current: userSession.id === currentSessionId
    }

    return NextResponse.json({ session: formattedSession })
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}