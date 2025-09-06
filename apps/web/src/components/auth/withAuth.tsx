"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ComponentType } from "react"
import { Loader2 } from "lucide-react"

export interface WithAuthOptions {
  requireAuth?: boolean
  requireVerification?: boolean
  requireRole?: string | string[]
  redirectTo?: string
  loadingComponent?: ComponentType
}

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requireAuth = true,
    requireVerification = false,
    requireRole,
    redirectTo = "/auth/login",
    loadingComponent: LoadingComponent
  } = options

  return function WithAuthComponent(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (status === "loading") return // Still loading

      // If authentication is required but user is not authenticated
      if (requireAuth && !session) {
        router.push(redirectTo)
        return
      }

      // If email verification is required but user email is not verified
      if (requireVerification && session && !session.user.email) {
        router.push("/auth/verify-email")
        return
      }

      // If specific role is required
      if (requireRole && session) {
        const userRole = session.user.role
        const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole]
        
        if (!requiredRoles.includes(userRole)) {
          router.push("/unauthorized")
          return
        }
      }
    }, [session, status, router])

    // Show loading state
    if (status === "loading") {
      if (LoadingComponent) {
        return <LoadingComponent />
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
    }

    // If authentication is required but user is not authenticated
    if (requireAuth && !session) {
      return null // Will redirect in useEffect
    }

    // If email verification is required but user email is not verified
    if (requireVerification && session && !session.user.email) {
      return null // Will redirect in useEffect
    }

    // If specific role is required
    if (requireRole && session) {
      const userRole = session.user.role
      const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole]
      
      if (!requiredRoles.includes(userRole)) {
        return null // Will redirect in useEffect
      }
    }

    // User meets all requirements
    return <WrappedComponent {...props} />
  }
}

// Utility function to check if user has required role
export function hasRole(session: any, role: string | string[]): boolean {
  if (!session?.user?.role) return false
  
  const requiredRoles = Array.isArray(role) ? role : [role]
  return requiredRoles.includes(session.user.role)
}

// Utility function to check if user is admin
export function isAdmin(session: any): boolean {
  return hasRole(session, "ADMIN")
}

// Utility function to check if user is editor or admin
export function isEditor(session: any): boolean {
  return hasRole(session, ["ADMIN", "VISITOR"])
}