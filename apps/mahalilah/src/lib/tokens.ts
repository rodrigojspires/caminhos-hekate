import { randomBytes } from 'crypto'
import { prisma } from '@hekate/database'

export async function generatePasswordResetToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.deleteMany({
    where: { email }
  })

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires
    }
  })

  return token
}
