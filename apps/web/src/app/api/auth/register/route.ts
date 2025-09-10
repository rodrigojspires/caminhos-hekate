import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { resendEmailService } from "@/lib/resend-email"
import { generateVerificationToken } from "@/lib/tokens"
import { RegisterSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = RegisterSchema.parse(body)
    const { name, email, password, confirmPassword, acceptTerms } = validatedData

    // Additional server-side validation
    if (!acceptTerms) {
      return NextResponse.json(
        { message: "Você deve aceitar os termos de uso e política de privacidade" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "Usuário já existe com este email" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate verification token
    const verificationToken = await generateVerificationToken(email)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "MEMBER",
      },
    })

    // Send verification email
    try {
      await resendEmailService.sendVerificationEmail({
      toEmail: email,
      verificationToken
    })
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // Don't fail the registration if email sending fails
      // The user can request a new verification email later
    }

    return NextResponse.json(
      {
        message: "Usuário criado com sucesso. Verifique seu email para ativar a conta.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)

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