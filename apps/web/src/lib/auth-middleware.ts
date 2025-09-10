import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// Tipos de roles permitidos
export type UserRole = 'ADMIN' | 'MODERATOR' | 'EDITOR' | 'USER'

// Interface para resposta de autorização
export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: UserRole
  }
  error?: {
    message: string
    status: number
  }
}

/**
 * Middleware para verificar autenticação básica
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: {
          message: 'Não autorizado - login necessário',
          status: 401
        }
      }
    }

    // Buscar dados completos do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: {
          message: 'Usuário não encontrado',
          status: 404
        }
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      success: false,
      error: {
        message: 'Erro interno de autenticação',
        status: 500
      }
    }
  }
}

/**
 * Middleware para verificar permissões administrativas
 * @param allowedRoles - Roles permitidos (padrão: ADMIN, MODERATOR)
 */
export async function requireAdminAuth(
  allowedRoles: UserRole[] = ['ADMIN', 'MODERATOR']
): Promise<AuthResult> {
  const authResult = await requireAuth()
  
  if (!authResult.success) {
    return authResult
  }

  const user = authResult.user!
  
  if (!allowedRoles.includes(user.role)) {
    return {
      success: false,
      error: {
        message: `Acesso negado - privilégios administrativos necessários. Roles permitidos: ${allowedRoles.join(', ')}`,
        status: 403
      }
    }
  }

  return authResult
}

/**
 * Middleware específico para operações que requerem apenas ADMIN
 */
export async function requireSuperAdminAuth(): Promise<AuthResult> {
  return requireAdminAuth(['ADMIN'])
}

/**
 * Middleware para operações de gamificação (ADMIN, EDITOR)
 */
export async function requireGamificationAuth(): Promise<AuthResult> {
  return requireAdminAuth(['ADMIN', 'EDITOR'])
}

/**
 * Helper para retornar resposta de erro de autorização
 */
export function createAuthErrorResponse(authResult: AuthResult): NextResponse {
  if (authResult.success) {
    throw new Error('Cannot create error response for successful auth result')
  }
  
  return NextResponse.json(
    { error: authResult.error!.message },
    { status: authResult.error!.status }
  )
}

/**
 * Wrapper para handlers que requerem autenticação
 */
export function withAuth<T extends any[]>(
  handler: (user: NonNullable<AuthResult['user']>, ...args: T) => Promise<NextResponse>,
  authCheck: () => Promise<AuthResult> = requireAuth
) {
  return async (...args: T): Promise<NextResponse> => {
    const authResult = await authCheck()
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }
    
    return handler(authResult.user!, ...args)
  }
}

/**
 * Wrapper para handlers que requerem permissões admin
 */
export function withAdminAuth<T extends any[]>(
  handler: (user: NonNullable<AuthResult['user']>, ...args: T) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return withAuth(handler, () => requireAdminAuth(allowedRoles))
}

/**
 * Wrapper para handlers que requerem super admin
 */
export function withSuperAdminAuth<T extends any[]>(
  handler: (user: NonNullable<AuthResult['user']>, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, requireSuperAdminAuth)
}

/**
 * Wrapper para handlers de gamificação
 */
export function withGamificationAuth<T extends any[]>(
  handler: (user: NonNullable<AuthResult['user']>, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, requireGamificationAuth)
}

/**
 * Verificação de permissão para recursos específicos
 */
export async function checkResourcePermission(
  userId: string,
  resourceType: 'course' | 'group' | 'event' | 'product',
  resourceId: string,
  action: 'read' | 'write' | 'delete' | 'admin'
): Promise<boolean> {
  try {
    const authResult = await requireAuth()
    
    if (!authResult.success) {
      return false
    }

    const user = authResult.user!
    
    // Super admins têm acesso total
    if (user.role === 'ADMIN') {
      return true
    }
    
    // Moderators têm acesso a operações não-destrutivas
    if (user.role === 'MODERATOR' && action !== 'delete') {
      return true
    }
    
    // Verificar ownership do recurso
    switch (resourceType) {
      case 'course':
        // Cursos não possuem campo de "instructor" no schema.
        // Para leitura, permitir se o curso estiver publicado OU se o usuário estiver matriculado.
        if (action === 'read') {
          const publishedCourse = await prisma.course.findFirst({
            where: {
              id: resourceId,
              status: 'PUBLISHED'
            }
          })
          if (publishedCourse) return true

          const enrollment = await prisma.enrollment.findFirst({
            where: {
              courseId: resourceId,
              userId
            }
          })
          return !!enrollment
        }
        // Para write/delete/admin, apenas ADMIN/MOD já cobertos acima
        return false
        
      case 'group':
        // createdBy é um campo String; filtro deve ser direto, não relacional
        const group = await prisma.group.findFirst({
          where: {
            id: resourceId,
            createdBy: userId
          }
        })
        return !!group
        
      case 'event':
        // createdBy é um campo String; filtro deve ser direto, não relacional
        const event = await prisma.event.findFirst({
          where: {
            id: resourceId,
            createdBy: userId
          }
        })
        return !!event
        
      default:
        return false
    }
  } catch (error) {
    console.error('Resource permission check error:', error)
    return false
  }
}