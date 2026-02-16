import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendMarketingContactEmail } from '@/lib/email'
import { applyRateLimit } from '@/lib/security/rate-limit'

const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120, 'Nome muito longo'),
  email: z.string().trim().email('Informe um e-mail válido').max(160, 'E-mail muito longo'),
  subject: z.string().trim().min(3, 'Informe o assunto').max(180, 'Assunto muito longo'),
  message: z.string().trim().min(10, 'Escreva uma mensagem com mais detalhes').max(5000, 'Mensagem muito longa')
})

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit({
      request,
      scope: 'marketing:contact',
      limit: 5,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const data = ContactSchema.parse(body)

    await sendMarketingContactEmail({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message
    })

    return NextResponse.json(
      { message: 'Mensagem enviada com sucesso. Em breve retornaremos.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no envio do formulário de contato (Maha Lilah):', error)

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

    return NextResponse.json(
      { message: 'Não foi possível enviar a mensagem agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
