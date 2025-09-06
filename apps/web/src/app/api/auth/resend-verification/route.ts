import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { sendVerificationEmail } from "@/lib/email"
import { generateVerificationToken } from "@/lib/tokens"
import { ResendVerificationSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = ResendVerificationSchema.parse(body)
    const { email } = validatedData

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Generate new verification token
    const verificationToken = await generateVerificationToken(email)

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      return NextResponse.json(
        { message: "Erro ao enviar email de verificação" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: "Email de verificação reenviado com sucesso",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Resend verification error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}