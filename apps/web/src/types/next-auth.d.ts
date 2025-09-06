import { Role } from "@hekate/database"
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      emailVerified: Date | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: Role
    emailVerified?: Date | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: Role
    emailVerified: Date | null
  }
}