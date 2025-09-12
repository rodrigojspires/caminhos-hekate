import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma, Role } from "@hekate/database"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            twoFactorBackupCodes: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Verificar se o usuário tem 2FA ativado
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          // Se não foi fornecido código 2FA, retornar erro específico
          if (!credentials.twoFactorCode) {
            throw new Error("2FA_REQUIRED")
          }

          // Verificar código 2FA
          const { authenticator } = await import('otplib')
          const isValidToken = authenticator.verify({
            token: credentials.twoFactorCode,
            secret: user.twoFactorSecret
          })

          if (!isValidToken) {
            // Verificar se é um código de backup
            const backupCodes = Array.isArray(user.twoFactorBackupCodes) ? user.twoFactorBackupCodes as string[] : []
            const upperToken = credentials.twoFactorCode.toUpperCase()
            
            if (!backupCodes.includes(upperToken)) {
              throw new Error("INVALID_2FA_CODE")
            }

            // Remover código de backup usado
            const updatedBackupCodes = backupCodes.filter(code => code !== upperToken)
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorBackupCodes: updatedBackupCodes }
            })
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        // Buscar dados atualizados do usuário incluindo emailVerified
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true, role: true }
        })
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
}

// Helper function to check if user is admin
export const isAdmin = (role: Role | undefined): boolean => {
  return role === Role.ADMIN
}

// Helper function to check if user has admin or editor permissions
export const hasAdminAccess = (role: Role | undefined): boolean => {
  return role === Role.ADMIN || role === Role.EDITOR
}

// Helper function to check admin permission in API routes
export const checkAdminPermission = async () => {
  const { getServerSession } = await import('next-auth/next')
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return { error: 'Não autorizado', status: 401 }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'EDITOR'].includes(user.role)) {
    return { error: 'Sem permissão', status: 403 }
  }

  return null
}

// Helper function to require authentication in API routes
export const requireAuth = async () => {
  const { getServerSession } = await import('next-auth/next')
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    throw new Error('Não autorizado')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, role: true }
  })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  return { user, session }
}

// Helper function to require admin authentication in API routes
export const requireAdminAuth = async () => {
  const { user, session } = await requireAuth()
  
  if (!['ADMIN', 'EDITOR'].includes(user.role)) {
    throw new Error('Sem permissão de administrador')
  }

  return { user, session }
}

// Helper function to check analytics permissions
export const checkAnalyticsPermission = async () => {
  const { getServerSession } = await import('next-auth/next')
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return { error: 'Não autorizado', status: 401 }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true }
  })

  if (!user) {
    return { error: 'Usuário não encontrado', status: 404 }
  }

  const isAdmin = hasAdminAccess(user.role)
  if (!isAdmin) {
    return { error: 'Sem permissão', status: 403 }
  }

  return { user, isAdmin }
}