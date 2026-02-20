import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { requireAdmin } from '@/lib/require-admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.calendarSyncEvent.updateMany({
        where: { eventId: event.id },
        data: { eventId: null },
      })

      await tx.calendarConflict.updateMany({
        where: { eventId: event.id },
        data: { eventId: null },
      })

      await tx.emailLog.updateMany({
        where: { eventId: event.id },
        data: { eventId: null },
      })

      await tx.reminder.deleteMany({
        where: { eventId: event.id },
      })

      await tx.eventReminder.deleteMany({
        where: { eventId: event.id },
      })

      await tx.eventRegistration.deleteMany({
        where: { eventId: event.id },
      })

      await tx.eventSync.deleteMany({
        where: { eventId: event.id },
      })

      await tx.recurringEvent.deleteMany({
        where: { parentEventId: event.id },
      })

      await tx.event.delete({
        where: { id: event.id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir evento no admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
