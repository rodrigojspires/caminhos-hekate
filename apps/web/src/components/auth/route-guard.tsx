'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Role } from '@hekate/database'

interface RouteGuardProps {
  children: ReactNode
  requireAuth?: boolean
  requiredRoles?: Role[]
  fallbackUrl?: string
  loadingComponent?: ReactNode
}

const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

export function RouteGuard({
  children,
  requireAuth = false,
  requiredRoles = [],
  fallbackUrl,
  loadingComponent = <DefaultLoadingComponent />
}: RouteGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    // If authentication is required but user is not authenticated
    if (requireAuth && !session) {
      const callbackUrl = encodeURIComponent(pathname || '/')
      const loginUrl = fallbackUrl || `/auth/login?callbackUrl=${callbackUrl}`
      router.push(loginUrl)
      return
    }

    // If specific roles are required
    if (requiredRoles.length > 0 && session) {
      const userRole = session.user?.role as Role
      if (!requiredRoles.includes(userRole)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [session, status, requireAuth, requiredRoles, router, pathname, fallbackUrl])

  // Show loading while checking authentication
  if (status === 'loading') {
    return <>{loadingComponent}</>
  }

  // If authentication is required but user is not authenticated, don't render children
  if (requireAuth && !session) {
    return <>{loadingComponent}</>
  }

  // If specific roles are required but user doesn't have them, don't render children
  if (requiredRoles.length > 0 && session) {
    const userRole = session.user?.role as Role
    if (!requiredRoles.includes(userRole)) {
      return <>{loadingComponent}</>
    }
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function ProtectedRoute({ children, ...props }: Omit<RouteGuardProps, 'requireAuth'>) {
  return (
    <RouteGuard requireAuth={true} {...props}>
      {children}
    </RouteGuard>
  )
}

export function AdminRoute({ children, ...props }: Omit<RouteGuardProps, 'requireAuth' | 'requiredRoles'>) {
  return (
    <RouteGuard 
      requireAuth={true} 
      requiredRoles={[Role.ADMIN]} 
      {...props}
    >
      {children}
    </RouteGuard>
  )
}

export function MemberRoute({ children, ...props }: Omit<RouteGuardProps, 'requireAuth' | 'requiredRoles'>) {
  return (
    <RouteGuard 
      requireAuth={true} 
      requiredRoles={[Role.ADMIN, Role.EDITOR, Role.MEMBER]} 
      {...props}
    >
      {children}
    </RouteGuard>
  )
}