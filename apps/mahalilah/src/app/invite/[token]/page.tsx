import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import {
  prisma,
  MahaLilahInviteRole,
  MahaLilahParticipantRole
} from '@hekate/database'
import { withSeoDefaults } from '@/lib/marketing/seo'

interface InvitePageProps {
  params: { token: string }
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = withSeoDefaults(
  {
    title: 'Convite para sala',
    description:
      'Página de convite para entrada em salas privadas do Maha Lilah Online.',
    openGraph: {
      title: 'Convite Maha Lilah Online',
      description:
        'Página de convite para entrada em salas privadas do Maha Lilah Online.',
      url: '/invite'
    }
  },
  { noIndex: true, canonicalPath: '/invite' }
)

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
  const participantRole =
    invite.role === MahaLilahInviteRole.THERAPIST
      ? MahaLilahParticipantRole.THERAPIST
      : MahaLilahParticipantRole.PLAYER

  await prisma.$transaction(async (tx) => {
    await tx.mahaLilahParticipant.upsert({
      where: {
        roomId_userId: {
          roomId: invite.roomId,
          userId: session.user.id
        }
      },
      update: {
        inviteId: invite.id,
        role: participantRole,
        joinedAt: now
      },
      create: {
        roomId: invite.roomId,
        userId: session.user.id,
        role: participantRole,
        inviteId: invite.id,
        joinedAt: now
      }
    })

    await tx.mahaLilahInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now }
    })

    if (invite.role === MahaLilahInviteRole.THERAPIST) {
      await tx.mahaLilahRoom.update({
        where: { id: invite.roomId },
        data: { createdByUserId: session.user.id }
      })
    }
  })

  redirect(`/rooms/${invite.room.code}`)
}
