"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requireVerification?: boolean
  redirectTo?: string
  fallback?: ReactNode
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireVerification = false,
  redirectTo = "/auth/login",
  fallback
}: ProtectedRouteProps) {
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
    if (requireVerification && session && !session.user.emailVerified) {
      router.push("/auth/verify-email?email=" + encodeURIComponent(session.user.email || ""))
      return
    }
  }, [session, status, requireAuth, requireVerification, redirectTo, router])

  // Show loading state
  if (status === "loading") {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
    )
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !session) {
    return null // Will redirect in useEffect
  }

  // If email verification is required but user email is not verified
  if (requireVerification && session && !session.user.emailVerified) {
    router.push("/auth/verify-email?email=" + encodeURIComponent(session.user.email || ""))
    return
  }

  // User is authenticated and meets all requirements
  return <>{children}</>
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}