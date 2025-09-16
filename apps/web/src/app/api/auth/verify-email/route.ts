import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { VerifyEmailSchema } from "@/lib/validations/auth"
import { verifyEmailToken } from "@/lib/tokens"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = VerifyEmailSchema.parse(body)
    const { token } = validatedData

    // Use helper to verify and mark user as verified atomically
    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "Token de verificação inválido ou expirado" },
        { status: 400 }
      )
    }

    // Fetch the updated user for response (optional)
    const user = await prisma.user.findUnique({ where: { email: result.email } })

    return NextResponse.json(
      {
        message: "Email verificado com sucesso",
        user: user
          ? { id: user.id, name: user.name, email: user.email }
          : { id: null, name: null, email: result.email },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Email verification error:", error)

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
