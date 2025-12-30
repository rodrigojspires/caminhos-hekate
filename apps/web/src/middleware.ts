import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { Role } from "@hekate/database"
import { initializeReminderProcessor } from "@/middleware/reminder-processor-middleware"

// Configurar runtime para Node.js
export const runtime = 'nodejs'

export default withAuth(
  async function middleware(req) {
    // Inicializar processador de lembretes na primeira requisição
    initializeReminderProcessor()
    
    const token = req.nextauth.token
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth")
    const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard")
    
    // If accessing admin routes, check for admin permissions
    if (isAdminRoute) {
      if (!token) {
        return NextResponse.redirect(new URL("/admin/login", req.url))
      }
      
      // Check if user has admin or editor role
      if (token.role !== Role.ADMIN && token.role !== Role.EDITOR) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }
    
    // If accessing dashboard routes, require authentication
    if (isDashboardRoute) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login?callbackUrl=" + encodeURIComponent(req.url), req.url))
      }
    }
    
    // If user is already authenticated and tries to access auth pages, redirect to appropriate dashboard
    if (isAuthRoute && token) {
      if (token.role === Role.ADMIN || token.role === Role.EDITOR) {
        return NextResponse.redirect(new URL("/admin", req.url))
      }
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
        const isAuthRoute = req.nextUrl.pathname.startsWith("/auth")
        const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard")
        
        // Allow access to auth routes without token
        if (isAuthRoute) {
          return true
        }
        
        // For admin routes, require token
        if (isAdminRoute) {
          return !!token
        }
        
        // For dashboard routes, require token
        if (isDashboardRoute) {
          return !!token
        }
        
        // Allow access to public routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/auth/:path*",
    "/dashboard/:path*",
    "/comunidade/:path*",
    "/cursos/:path*"
  ]
}
