import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole } from '@hekate/database'

interface InvitePageProps {
  params: { token: string }
}

export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: InvitePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${params.token}`)}`)
  }

  const invite = await prisma.mahaLilahInvite.findUnique({
    where: { token: params.token },
    include: { room: true }
  })

  if (!invite) {
    return (
      <main>
        <div className="card">Convite inválido ou expirado.</div>
      </main>
    )
  }

  const sessionEmail = session.user.email.toLowerCase()
  const inviteEmail = invite.email.toLowerCase()

  if (sessionEmail !== inviteEmail) {
    return (
      <main>
        <div className="card">Este convite foi enviado para outro e-mail.</div>
      </main>
    )
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.mahaLilahParticipant.upsert({
      where: {
        roomId_userId: {
          roomId: invite.roomId,
          userId: session.user.id
        }
      },
      update: {
        inviteId: invite.id,
        role: MahaLilahParticipantRole.PLAYER,
        joinedAt: now
      },
      create: {
        roomId: invite.roomId,
        userId: session.user.id,
        role: MahaLilahParticipantRole.PLAYER,
        inviteId: invite.id,
        joinedAt: now
      }
    }),
    prisma.mahaLilahInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now }
    })
  ])

  redirect(`/rooms/${invite.room.code}`)
}
