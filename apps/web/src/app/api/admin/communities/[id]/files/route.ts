import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  fileUrl: z.string().min(1, 'URL é obrigatória'),
  fileType: z.string().optional(),
  fileSize: z.number().int().positive().optional()
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const files = await prisma.communityFile.findMany({
      where: { communityId: params.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      files: files.map((file) => ({
        ...file,
        fileSize: file.fileSize ?? null
      }))
    })
  } catch (error) {
    console.error('Erro ao listar arquivos da comunidade:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    const file = await prisma.communityFile.create({
      data: {
        communityId: params.id,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl,
        fileType: data.fileType || null,
        fileSize: data.fileSize ?? null
      }
    })

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar arquivo da comunidade:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json({ error: 'Arquivo não informado' }, { status: 400 })
    }

    await prisma.communityFile.delete({
      where: { id: fileId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover arquivo da comunidade:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
