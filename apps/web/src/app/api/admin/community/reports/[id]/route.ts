import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { UpdateReportSchema } from '@/lib/validations/community'
import { z } from 'zod'

// GET /api/admin/community/reports/[id] - Buscar relatório por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            status: true,
            author: {
              select: {
                id: true,
                name: true
              }
            },
            topic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true
              }
            },
            post: {
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Erro ao buscar relatório:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/community/reports/[id] - Atualizar relatório (resolver/rejeitar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = UpdateReportSchema.parse(body)

    // Verificar se o relatório existe
    const existingReport = await prisma.report.findUnique({
      where: { id: params.id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }

    // Se o status está sendo alterado para RESOLVED ou DISMISSED, adicionar dados do revisor
    const updateData: any = { ...data }
    
    if (data.status && ['RESOLVED', 'DISMISSED'].includes(data.status)) {
      updateData.reviewerId = session.user.id
      updateData.reviewedAt = new Date()
    }

    const report = await prisma.report.update({
      where: { id: params.id },
      data: updateData,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            status: true,
            author: {
              select: {
                id: true,
                name: true
              }
            },
            topic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true
              }
            },
            post: {
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/community/reports/[id] - Deletar relatório
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se o relatório existe
    const existingReport = await prisma.report.findUnique({
      where: { id: params.id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }

    await prisma.report.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'Relatório deletado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar relatório:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}