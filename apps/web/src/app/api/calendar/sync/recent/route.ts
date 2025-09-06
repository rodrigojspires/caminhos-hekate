import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar integrações do usuário
    const userIntegrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const integrationIds = userIntegrations.map(i => i.id);

    if (integrationIds.length === 0) {
      return NextResponse.json({
        syncEvents: [],
        total: 0,
      });
    }

    // Buscar eventos de sincronização recentes
    const syncEvents = await prisma.calendarSyncEvent.findMany({
      where: {
        integrationId: {
          in: integrationIds,
        },
      },
      include: {
        integration: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Contar total de eventos
    const total = await prisma.calendarSyncEvent.count({
      where: {
        integrationId: {
          in: integrationIds,
        },
      },
    });

    // Formatar dados para o frontend
    const formattedEvents = syncEvents.map(event => ({
      id: event.id,
      provider: event.integration.provider,
      status: event.status,
      direction: event.direction,
      operation: event.operation,
      scheduledAt: event.scheduledAt,
      processedAt: event.processedAt,
      duration: event.processedAt && event.scheduledAt 
        ? event.processedAt.getTime() - event.scheduledAt.getTime()
        : null,
      error: event.error,
      retryCount: event.retryCount,
      providerAccountId: event.integration.providerAccountId,
    }));

    return NextResponse.json({
      syncEvents: formattedEvents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching recent sync events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}