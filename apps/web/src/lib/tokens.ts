import { randomBytes } from 'crypto'
import { prisma } from '@hekate/database'

// Gerar token de verificação de email
export async function generateVerificationToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  
  // Remover tokens existentes para este email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email }
  })
  
  // Criar novo token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires
    }
  })
  
  return token
}

// Gerar token de recuperação de senha
export async function generatePasswordResetToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora
  
  // Remover tokens existentes para este email
  await prisma.passwordResetToken.deleteMany({
    where: { email }
  })
  
  // Criar novo token
  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires
    }
  })
  
  return token
}

// Verificar token de verificação de email
export async function verifyEmailToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token }
  })
  
  if (!verificationToken) {
    return { success: false, error: 'Token inválido' }
  }
  
  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { token }
    })
    return { success: false, error: 'Token expirado' }
  }
  
  // Marcar usuário como verificado
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { 
      emailVerified: new Date()
    }
  })
  
  // Remover token usado
  await prisma.verificationToken.delete({
    where: { token }
  })
  
  return { success: true, email: verificationToken.identifier }
}

// Verificar token de recuperação de senha
export async function verifyPasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  })
  
  if (!resetToken) {
    return { success: false, error: 'Token inválido' }
  }
  
  if (resetToken.expires < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { token }
    })
    return { success: false, error: 'Token expirado' }
  }
  
  return { success: true, email: resetToken.email }
}

// Consumir token de recuperação de senha
export async function consumePasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  })
  
  if (resetToken) {
    await prisma.passwordResetToken.delete({
      where: { token }
    })
  }
  
  return resetToken
}