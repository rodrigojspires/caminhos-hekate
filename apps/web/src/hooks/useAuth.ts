'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Role } from '@hekate/database'

interface User {
  id: string
  email: string
  name?: string
  role: Role
  emailVerified?: Date
  image?: string
}

interface UseAuthReturn {
  user: User | null
  session: any
  status: 'loading' | 'authenticated' | 'unauthenticated'
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: Role | Role[]) => boolean
  isAdmin: boolean
  isEditor: boolean
  signOut: () => void
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()
  const router = useRouter()

  const user = session?.user as User | null
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  const hasRole = (role: Role | Role[]): boolean => {
    if (!user?.role) return false
    const requiredRoles = Array.isArray(role) ? role : [role]
    return requiredRoles.includes(user.role)
  }

  const isAdmin = hasRole('ADMIN')
  const isEditor = hasRole(['ADMIN', 'EDITOR'])

  const signOut = () => {
    router.push('/auth/login')
  }

  return {
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    hasRole,
    isAdmin,
    isEditor,
    signOut
  }
}