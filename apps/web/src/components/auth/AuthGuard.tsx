"use client"

import { useSession } from "next-auth/react"
import { ReactNode } from "react"
import { hasRole, isAdmin, isEditor } from "./withAuth"

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  requireVerification?: boolean
  requireRole?: string | string[]
  requireAdmin?: boolean
  requireEditor?: boolean
  fallback?: ReactNode
  inverse?: boolean // Show content only if conditions are NOT met
}

export function AuthGuard({
  children,
  requireAuth = false,
  requireVerification = false,
  requireRole,
  requireAdmin = false,
  requireEditor = false,
  fallback = null,
  inverse = false
}: AuthGuardProps) {
  const { data: session, status } = useSession()

  // Still loading
  if (status === "loading") {
    return <>{fallback}</>
  }

  let shouldShow = true

  // Check authentication requirement
  if (requireAuth && !session) {
    shouldShow = false
  }

  // Check email verification requirement
  if (requireVerification && session && !session.user.emailVerified) {
    shouldShow = false
  }

  // Check role requirement
  if (requireRole && !hasRole(session, requireRole)) {
    shouldShow = false
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin(session)) {
    shouldShow = false
  }

  // Check editor requirement (admin or editor)
  if (requireEditor && !isEditor(session)) {
    shouldShow = false
  }

  // Apply inverse logic if specified
  if (inverse) {
    shouldShow = !shouldShow
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>
}

// Convenience components for common use cases
export function AuthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function UnauthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth inverse fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAdmin fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function EditorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireEditor fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function VerifiedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth requireVerification fallback={fallback}>
      {children}
    </AuthGuard>
  )
}