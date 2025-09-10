import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { resendEmailService } from "@/lib/resend-email"
import { generatePasswordResetToken } from "@/lib/tokens"
import { ForgotPasswordSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = ForgotPasswordSchema.parse(body)
    const { email } = validatedData

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      try {
        // Generate password reset token with expiration (1 hour)
        const resetToken = await generatePasswordResetToken(user.email)

        // Send password reset email
        await resendEmailService.sendPasswordResetEmail({
      toEmail: user.email,
      resetToken
    })
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError)
        // Don't expose email sending errors to the client
      }
    }

    return NextResponse.json(
      {
        message: "Se o email existir em nossa base de dados, você receberá um link de recuperação.",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)

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