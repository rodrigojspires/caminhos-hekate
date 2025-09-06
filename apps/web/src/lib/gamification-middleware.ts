import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Middleware for automatic activity tracking
 * Tracks user activities based on route patterns and HTTP methods
 */

interface ActivityMapping {
  pattern: RegExp
  method: string
  activityType: string
  extractMetadata?: (req: Request, pathname: string) => any
}

// Define activity mappings based on routes
const ACTIVITY_MAPPINGS: ActivityMapping[] = [
  // Profile activities
  {
    pattern: /^\/api\/user\/profile$/,
    method: 'PUT',
    activityType: 'PROFILE_UPDATE',
    extractMetadata: (req) => ({ section: 'general' })
  },
  {
    pattern: /^\/api\/user\/avatar$/,
    method: 'POST',
    activityType: 'AVATAR_UPDATE'
  },
  
  // Course activities
  {
    pattern: /^\/api\/courses\/([^/]+)\/complete$/,
    method: 'POST',
    activityType: 'COURSE_COMPLETE',
    extractMetadata: (req, pathname) => {
      const courseId = pathname.split('/')[3]
      return { courseId }
    }
  },
  {
    pattern: /^\/api\/lessons\/([^/]+)\/complete$/,
    method: 'POST',
    activityType: 'LESSON_COMPLETE',
    extractMetadata: (req, pathname) => {
      const lessonId = pathname.split('/')[3]
      return { lessonId }
    }
  },
  {
    pattern: /^\/api\/quizzes\/([^/]+)\/submit$/,
    method: 'POST',
    activityType: 'QUIZ_COMPLETE',
    extractMetadata: async (req, pathname) => {
      const quizId = pathname.split('/')[3]
      try {
        const body = await req.json()
        return { 
          quizId, 
          score: body.score || 0,
          passed: body.passed || false
        }
      } catch {
        return { quizId }
      }
    }
  },
  
  // Purchase activities
  {
    pattern: /^\/api\/payments\/success$/,
    method: 'POST',
    activityType: 'PURCHASE_COMPLETE',
    extractMetadata: async (req) => {
      try {
        const body = await req.json()
        return {
          amount: body.amount || 0,
          productId: body.productId,
          isFirstPurchase: body.isFirstPurchase || false
        }
      } catch {
        return {}
      }
    }
  },
  
  // Social activities
  {
    pattern: /^\/api\/comments$/,
    method: 'POST',
    activityType: 'COMMENT_POST',
    extractMetadata: async (req) => {
      try {
        const body = await req.json()
        return {
          contentId: body.contentId,
          contentType: body.contentType || 'unknown'
        }
      } catch {
        return {}
      }
    }
  },
  {
    pattern: /^\/api\/share$/,
    method: 'POST',
    activityType: 'SHARE_CONTENT',
    extractMetadata: async (req) => {
      try {
        const body = await req.json()
        return {
          contentId: body.contentId,
          platform: body.platform || 'unknown'
        }
      } catch {
        return {}
      }
    }
  },
  
  // Group activities
  {
    pattern: /^\/api\/groups\/([^/]+)\/join$/,
    method: 'POST',
    activityType: 'GROUP_JOIN',
    extractMetadata: (req, pathname) => {
      const groupId = pathname.split('/')[3]
      return { groupId }
    }
  },
  {
    pattern: /^\/api\/groups\/([^/]+)\/posts$/,
    method: 'POST',
    activityType: 'GROUP_POST',
    extractMetadata: (req, pathname) => {
      const groupId = pathname.split('/')[3]
      return { groupId }
    }
  },
  
  // Review activities
  {
    pattern: /^\/api\/reviews$/,
    method: 'POST',
    activityType: 'REVIEW_SUBMIT',
    extractMetadata: async (req) => {
      try {
        const body = await req.json()
        return {
          productId: body.productId,
          rating: body.rating || 0
        }
      } catch {
        return {}
      }
    }
  },
  
  // Invitation activities
  {
    pattern: /^\/api\/invitations$/,
    method: 'POST',
    activityType: 'INVITE_FRIEND',
    extractMetadata: async (req) => {
      try {
        const body = await req.json()
        return {
          invitedEmail: body.email
        }
      } catch {
        return {}
      }
    }
  }
]

/**
 * Track activity based on request
 */
async function trackActivity(
  userId: string,
  activityType: string,
  metadata: any = {}
) {
  try {
    // Make internal API call to track activity
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/gamification/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true' // Mark as internal to avoid infinite loops
      },
      body: JSON.stringify({
        userId,
        activityType,
        metadata
      })
    })

    if (!response.ok) {
      console.error('Failed to track activity:', activityType)
    }
  } catch (error) {
    console.error('Error tracking activity:', error)
  }
}

/**
 * Main gamification middleware function
 */
export async function gamificationMiddleware(request: NextRequest) {
  // Skip if this is an internal gamification request to avoid loops
  if (request.headers.get('X-Internal-Request')) {
    return NextResponse.next()
  }

  // Skip if this is already a gamification API route
  if (request.nextUrl.pathname.startsWith('/api/gamification/')) {
    return NextResponse.next()
  }

  // Get user token
  const token = await getToken({ req: request })
  if (!token?.sub) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const method = request.method

  // Find matching activity mapping
  const mapping = ACTIVITY_MAPPINGS.find(
    m => m.pattern.test(pathname) && m.method === method
  )

  if (!mapping) {
    return NextResponse.next()
  }

  // Process the request first
  const response = NextResponse.next()

  // Track activity asynchronously (don't block the response)
  setTimeout(async () => {
    try {
      let metadata = {}
      
      if (mapping.extractMetadata) {
        // Clone the request for metadata extraction
        const clonedRequest = request.clone()
        metadata = await mapping.extractMetadata(clonedRequest, pathname)
      }

      await trackActivity(token.sub!, mapping.activityType, metadata)
    } catch (error) {
      console.error('Error in gamification middleware:', error)
    }
  }, 0)

  return response
}

/**
 * Helper function to manually track activities
 */
export async function manualTrackActivity(
  userId: string,
  activityType: string,
  metadata: any = {}
) {
  return trackActivity(userId, activityType, metadata)
}

/**
 * Configuration for specific routes that should be tracked
 */
export const GAMIFICATION_CONFIG = {
  // Routes that should always track login activity
  LOGIN_ROUTES: ['/api/auth/callback', '/api/auth/signin'],
  
  // Routes that should be excluded from tracking
  EXCLUDED_ROUTES: [
    '/api/gamification',
    '/api/auth',
    '/api/health',
    '/_next',
    '/favicon.ico'
  ],
  
  // Activity types and their point values
  ACTIVITY_POINTS: {
    'LOGIN': 5,
    'PROFILE_UPDATE': 10,
    'AVATAR_UPDATE': 15,
    'COURSE_COMPLETE': 100,
    'LESSON_COMPLETE': 25,
    'QUIZ_COMPLETE': 50,
    'PURCHASE_COMPLETE': 200,
    'COMMENT_POST': 10,
    'SHARE_CONTENT': 15,
    'GROUP_JOIN': 30,
    'GROUP_POST': 20,
    'REVIEW_SUBMIT': 25,
    'INVITE_FRIEND': 50
  }
}

/**
 * Utility function to check if a route should be tracked
 */
export function shouldTrackRoute(pathname: string): boolean {
  return !GAMIFICATION_CONFIG.EXCLUDED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
}
