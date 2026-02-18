import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma, Role } from "@hekate/database"

// Garante que o NextAuth use a URL do Maha Lilah mesmo com .env compartilhado
if (process.env.NEXTAUTH_URL_MAHALILAH) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL_MAHALILAH
}

const isSoftDeletedEmail = (email: string | null | undefined) =>
  typeof email === "string" && email.startsWith("deleted_")

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
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
            emailVerified: true
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

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED")
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
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, user }) {
      const userId = user?.id || token.sub

      if (!userId) {
        return token
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true
        }
      })

      // Revoga sessão quando usuário não existe mais, foi anonimizado ou perdeu verificação.
      if (!dbUser || isSoftDeletedEmail(dbUser.email) || !dbUser.emailVerified) {
        return {
          ...token,
          sub: undefined,
          email: undefined,
          name: undefined,
          role: Role.VISITOR,
          emailVerified: null,
          exp: 0
        }
      }

      token.sub = dbUser.id
      token.email = dbUser.email
      token.name = dbUser.name
      token.role = dbUser.role
      token.emailVerified = dbUser.emailVerified

      return token
    },
    async session({ session, token }) {
      if (!token?.sub || !token?.email) {
        session.user.id = ""
        session.user.email = null
        session.user.name = null
        session.user.role = Role.VISITOR
        session.user.emailVerified = null
        return session
      }

      session.user.id = token.sub
      session.user.email = token.email
      session.user.name = token.name ?? null
      session.user.role = token.role as Role
      session.user.emailVerified = token.emailVerified as Date | null

      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}

export const isAdmin = (role: Role | undefined): boolean => {
  return role === Role.ADMIN
}

export const hasAdminAccess = (role: Role | undefined): boolean => {
  return role === Role.ADMIN || role === Role.EDITOR
}

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
