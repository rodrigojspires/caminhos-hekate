import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@hekate/database'

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = RegisterSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Usuário já existe com este email' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'MEMBER',
        emailVerified: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    return NextResponse.json({ message: 'Conta criada com sucesso.', user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'Dados inválidos',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('Erro ao registrar usuário (Maha Lilah):', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
