import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, SyncStatus } from '@hekate/database'
import { CalendarSyncService } from '@/lib/calendar/sync';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, direction = 'BIDIRECTIONAL', options = {} } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verificar se a integração existe e pertence ao usuário
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma sincronização em andamento
    const ongoingSync = await prisma.calendarSyncEvent.findFirst({
      where: {
        integrationId,
        status: SyncStatus.PENDING,
      },
    });

    if (ongoingSync) {
      return NextResponse.json(
        { error: 'Sync already in progress for this integration' },
        { status: 409 }
      );
    }

    // Criar evento de sincronização
    const syncEvent = await prisma.calendarSyncEvent.create({
      data: {
        integrationId,
        externalId: `sync-${Date.now()}`,
        operation: 'SYNC',
        direction,
        status: SyncStatus.PENDING,
        scheduledAt: new Date(),
      },
    });

    // Iniciar sincronização em background
    const syncService = new CalendarSyncService();
    
    // Executar sincronização de forma assíncrona
    syncService.syncCalendar({ integrationId, direction, ...options }).then(async (result) => {
      // Atualizar evento de sincronização com resultado
      await prisma.calendarSyncEvent.update({
        where: { id: syncEvent.id },
        data: {
          status: result.success ? SyncStatus.SYNCED : SyncStatus.FAILED,
          processedAt: new Date(),
          error: result.errors ? result.errors.join('; ') : null,
        },
      });

      // Atualizar última sincronização da integração
      if (result.success) {
        await prisma.calendarIntegration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
          },
        });
      }
    }).catch(async (error) => {
      console.error('Sync error:', error);
      await prisma.calendarSyncEvent.update({
        where: { id: syncEvent.id },
        data: {
          status: SyncStatus.FAILED,
          processedAt: new Date(),
          error: (error as Error).message,
        },
      });
    });

    return NextResponse.json({
      syncEventId: syncEvent.id,
      message: 'Sync started successfully',
      status: SyncStatus.PENDING,
    });
  } catch (error) {
    console.error('Error starting calendar sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syncEventId = searchParams.get('syncEventId');

    if (!syncEventId) {
      return NextResponse.json(
        { error: 'Sync event ID is required' },
        { status: 400 }
      );
    }

    // Buscar evento de sincronização
    const syncEvent = await prisma.calendarSyncEvent.findFirst({
      where: {
        id: syncEventId,
        integration: {
          userId: session.user.id,
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
    });

    if (!syncEvent) {
      return NextResponse.json(
        { error: 'Sync event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: syncEvent.id,
      provider: syncEvent.integration.provider,
      status: syncEvent.status,
      direction: syncEvent.direction,
      operation: syncEvent.operation,
      scheduledAt: syncEvent.scheduledAt,
      processedAt: syncEvent.processedAt,
      duration: syncEvent.processedAt && syncEvent.scheduledAt 
        ? syncEvent.processedAt.getTime() - syncEvent.scheduledAt.getTime()
        : null,
      error: syncEvent.error,
      retryCount: syncEvent.retryCount,
      providerAccountId: syncEvent.integration.providerAccountId,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}