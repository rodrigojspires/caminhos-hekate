import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticator } from 'otplib'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const verifyLoginSchema = z.object({
  email: z.string().email().optional(), // Email for login verification
  token: z.string().min(6).max(10), // 6 digits for TOTP, 8-10 chars for backup codes
  isBackupCode: z.boolean().optional().default(false), // Indicates if using backup code
  rememberDevice: z.boolean().optional().default(false)
})

// POST /api/auth/2fa/verify - Verify 2FA code during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, isBackupCode, rememberDevice } = verifyLoginSchema.parse(body)

    let user
    
    // If email is provided, this is a login verification (no session required)
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true
        }
      })
    } else {
      // If no email, require session (for authenticated operations)
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Email is required for login verification or valid session for authenticated operations' },
          { status: 401 }
        )
      }
      
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      )
    }

    const backupCodes: string[] = Array.isArray(user.twoFactorBackupCodes) ? user.twoFactorBackupCodes as string[] : []
    let isValid = false
    let usedBackupCode = false
    let updatedBackupCodes = backupCodes

    if (isBackupCode) {
      // User explicitly wants to use backup code
      const upperToken = token.toUpperCase()
      isValid = backupCodes.includes(upperToken)
      if (isValid) {
        usedBackupCode = true
        // Remove used backup code
        updatedBackupCodes = backupCodes.filter(
          code => code !== upperToken
        )
      }
    } else {
      // User wants to use TOTP code
      if (token.length === 6 && /^\d{6}$/.test(token)) {
        isValid = authenticator.verify({
          token: token,
          secret: user.twoFactorSecret
        })
      }
      
      // If TOTP failed and token looks like backup code, try backup codes as fallback
      if (!isValid && token.length >= 8) {
        const upperToken = token.toUpperCase()
        isValid = backupCodes.includes(upperToken)
        if (isValid) {
          usedBackupCode = true
          // Remove used backup code
          updatedBackupCodes = backupCodes.filter(
            code => code !== upperToken
          )
        }
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Update backup codes if one was used
    if (usedBackupCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: updatedBackupCodes
        }
      })
    }

    // Generate trusted device token if requested
    let trustedDeviceToken = null
    if (rememberDevice) {
      trustedDeviceToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
      // In a real app, store this token with expiration (e.g., 30 days)
      // You could add a trustedDevices field to the user model to store these
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      usedBackupCode,
      remainingBackupCodes: updatedBackupCodes.length,
      trustedDeviceToken
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error verifying 2FA code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}