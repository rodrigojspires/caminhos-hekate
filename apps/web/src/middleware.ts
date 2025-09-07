import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { Role, prisma } from "@hekate/database"
// import { initializeReminderProcessor } from "@/middleware/reminder-processor-middleware"

// Configurar runtime para Node.js
export const runtime = 'nodejs'

export default withAuth(
  async function middleware(req) {
    // Inicializar processador de lembretes na primeira requisição
    // initializeReminderProcessor()
    
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

    // Tier gating for selected public pages (posts/courses)
    try {
      const pathname = req.nextUrl.pathname
      const isPricing = pathname.startsWith('/precos')
      if (!isPricing) {
        const order = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 } as const
        let requiredTier: keyof typeof order | null = null

        // Comunidade post
        const postMatch = pathname.match(/^\/comunidade\/post\/(.+)$/)
        if (postMatch) {
          const slug = decodeURIComponent(postMatch[1])
        const post = await prisma.post.findUnique({ where: { slug }, select: { tier: true } })
          if (post?.tier) requiredTier = post.tier as keyof typeof order
        }

        // Curso
        if (!requiredTier) {
          const courseMatch = pathname.match(/^\/cursos\/(.+)$/)
          if (courseMatch) {
            const slug = decodeURIComponent(courseMatch[1])
            const course = await prisma.course.findUnique({ where: { slug }, select: { tier: true } })
            if (course?.tier) requiredTier = course.tier as keyof typeof order
          }
        }

        if (requiredTier && requiredTier !== 'FREE') {
          const userId = token?.sub
          let userTier: keyof typeof order = 'FREE'
          if (userId) {
            const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
            userTier = (dbUser?.subscriptionTier as keyof typeof order) || 'FREE'
          }
          const allowed = order[userTier] >= order[requiredTier]
          if (!allowed) {
            const url = new URL(`/precos`, req.url)
            url.searchParams.set('reason', 'tier')
            url.searchParams.set('returnTo', req.nextUrl.pathname + (req.nextUrl.search || ''))
            return NextResponse.redirect(url)
          }
        }
      }
    } catch (e) {
      // Fail open on middleware errors
      console.error('Tier gating middleware error:', e)
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
