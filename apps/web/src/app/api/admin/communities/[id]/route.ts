import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const community = await prisma.community.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            memberships: true,
            topics: true,
            posts: true,
            groups: true,
          }
        }
      }
    })

    if (!community) {
      return NextResponse.json({ error: 'Comunidade não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      ...community,
      price: community.price != null ? Number(community.price) : null
    })
  } catch (error) {
    console.error('Erro ao buscar comunidade:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
