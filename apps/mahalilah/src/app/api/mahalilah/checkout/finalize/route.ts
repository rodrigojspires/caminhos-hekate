import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import {
  MahaLilahParticipantRole,
  MahaLilahPlanType,
  MahaLilahRoomStatus,
  prisma
} from '@hekate/database'
import { authOptions } from '@/lib/auth'
import { generateRoomCode } from '@/lib/mahalilah/room-code'
import { MercadoPagoService } from '@/lib/payments/mercadopago'
import { sendRoomCreatedEmail } from '@/lib/email'
import {
  awardMahaGamificationPoints,
  getMahaGamificationPointSettings
} from '@/lib/gamification'

export const dynamic = 'force-dynamic'

const FinalizeCheckoutSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().trim().min(1).optional()
})

async function ensureUniqueRoomCode(db: {
  mahaLilahRoom: {
    findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null>
  }
}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode()
    const exists = await db.mahaLilahRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Não foi possível gerar um código único para sala automática.')
}

async function isPaymentApprovedForOrder(orderId: string, paymentId?: string) {
  const latestTx = await prisma.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true
    }
  })

  if (!latestTx) return false
  if (latestTx.status === 'COMPLETED') return true
  if (!paymentId) return false

  try {
    const mp = new MercadoPagoService()
    const payment = await mp.getPayment(paymentId)
    return (
      payment.status === 'approved' &&
      String(payment.external_reference || '') === latestTx.id
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const data = FinalizeCheckoutSchema.parse(payload)

    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId: session.user.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
    }

    const metadata = (order.metadata as any) || {}
    const maha = metadata.mahalilah || {}
    if (maha.planType !== 'SINGLE_SESSION') {
      return NextResponse.json(
        { error: 'Este pedido não é de sessão avulsa.' },
        { status: 400 }
      )
    }

    const existingRoom = await prisma.mahaLilahRoom.findFirst({
      where: { orderId: order.id },
      select: { id: true, code: true }
    })

    if (existingRoom) {
      return NextResponse.json({
        ok: true,
        created: false,
        room: existingRoom
      })
    }

    const paymentApproved =
      order.status === 'PAID' ||
      (await isPaymentApprovedForOrder(order.id, data.paymentId))

    if (!paymentApproved) {
      return NextResponse.json(
        { error: 'Pagamento ainda não confirmado. Tente novamente em instantes.' },
        { status: 409 }
      )
    }

    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const roomByOrder = await tx.mahaLilahRoom.findFirst({
        where: { orderId: order.id },
        select: { id: true, code: true }
      })
      if (roomByOrder) return { room: roomByOrder, wasCreated: false as const }

      const code = await ensureUniqueRoomCode(tx)
      const createdRoom = await tx.mahaLilahRoom.create({
        data: {
          code,
          createdByUserId: order.userId,
          status: MahaLilahRoomStatus.ACTIVE,
          maxParticipants: Number(maha.maxParticipants || 4),
          therapistPlays: true,
          therapistSoloPlay: false,
          isTrial: false,
          planType: MahaLilahPlanType.SINGLE_SESSION,
          orderId: order.id,
          consentTextVersion: process.env.MAHALILAH_CONSENT_VERSION || 'v1'
        },
        select: { id: true, code: true }
      })

      await tx.mahaLilahParticipant.create({
        data: {
          roomId: createdRoom.id,
          userId: order.userId,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: order.customerName || null
        }
      })

      await tx.mahaLilahGameState.create({
        data: { roomId: createdRoom.id }
      })

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          metadata: {
            ...metadata,
            mahalilah: {
              ...maha,
              active: true,
              activatedAt: now.toISOString(),
              expiresAt: null,
              roomsUsed: 1,
              autoRoomId: createdRoom.id,
              autoRoomCode: createdRoom.code,
              autoRoomCreatedAt: now.toISOString()
            }
          }
        }
      })

      return { room: createdRoom, wasCreated: true as const }
    })

    if (result.wasCreated) {
      try {
        await sendRoomCreatedEmail({
          to: order.customerEmail,
          recipientName: order.customerName,
          roomCode: result.room.code
        })
      } catch (error) {
        console.warn('Falha ao enviar e-mail de sala criada (checkout/finalize):', error)
      }
    }

    if (order.userId) {
      try {
        const pointSettings = await getMahaGamificationPointSettings()
        await awardMahaGamificationPoints({
          userId: order.userId,
          points: pointSettings.roomPurchasePoints,
          eventType: 'MAHALILAH_ROOM_PURCHASED',
          reasonLabel: 'Compra de sala Maha Lilah',
          uniqueKey: `mahalilah_single_session_purchase_${order.id}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            source: 'checkout_finalize'
          }
        })
      } catch (error) {
        console.warn('Falha ao conceder pontos de compra Maha Lilah (finalize):', error)
      }
    }

    return NextResponse.json({
      ok: true,
      created: result.wasCreated,
      room: result.room
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload inválido.', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao finalizar checkout Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
