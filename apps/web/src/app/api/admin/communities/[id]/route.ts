import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { UpdateCommunitySchema } from '@/lib/validations/community'
import { z } from 'zod'

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const data = UpdateCommunitySchema.parse(body)

    const existing = await prisma.community.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Comunidade não encontrada' }, { status: 404 })
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.community.findUnique({ where: { slug: data.slug } })
      if (slugExists) {
        return NextResponse.json({ error: 'Já existe uma comunidade com este slug' }, { status: 409 })
      }
    }

    const updated = await prisma.community.update({
      where: { id: params.id },
      data: {
        ...data,
        price: data.price ?? null
      }
    })

    return NextResponse.json({
      ...updated,
      price: updated.price != null ? Number(updated.price) : null
    })
  } catch (error) {
    console.error('Erro ao atualizar comunidade:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
