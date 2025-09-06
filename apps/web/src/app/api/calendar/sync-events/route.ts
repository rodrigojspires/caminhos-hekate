import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { SyncStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const status = searchParams.get('status') as SyncStatus | null;
    const direction = searchParams.get('direction');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {
      integration: {
        userId: session.user.id
      }
    };

    if (integrationId) {
      where.integrationId = integrationId;
    }

    if (status && Object.values(SyncStatus).includes(status)) {
      where.status = status;
    }

    if (direction) {
      where.direction = direction;
    }

    const [syncEvents, total] = await Promise.all([
      prisma.calendarSyncEvent.findMany({
        where,
        include: {
          integration: {
            select: {
              id: true,
              provider: true,
              calendarName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.calendarSyncEvent.count({ where })
    ]);

    const formattedSyncEvents = syncEvents.map(event => ({
      id: event.id,
      integrationId: event.integrationId,
      integration: event.integration,
      status: event.status,
      direction: event.direction,
      startedAt: event.startedAt,
      processedAt: event.processedAt,
      duration: event.processedAt && event.startedAt
        ? Math.round((event.processedAt.getTime() - event.startedAt.getTime()) / 1000)
        : null,
      error: event.error,
      createdAt: event.createdAt
    }));

    return NextResponse.json({
      syncEvents: formattedSyncEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sync events error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync events' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syncEventId = searchParams.get('id');
    const integrationId = searchParams.get('integrationId');
    const olderThan = searchParams.get('olderThan'); // ISO date string

    if (syncEventId) {
      // Delete specific sync event
      const syncEvent = await prisma.calendarSyncEvent.findFirst({
        where: {
          id: syncEventId,
          integration: {
            userId: session.user.id
          }
        }
      });

      if (!syncEvent) {
        return NextResponse.json(
          { error: 'Sync event not found' },
          { status: 404 }
        );
      }

      await prisma.calendarSyncEvent.delete({
        where: { id: syncEventId }
      });

      return NextResponse.json({ success: true });
    }

    if (integrationId || olderThan) {
      // Bulk delete sync events
      const where: any = {
        integration: {
          userId: session.user.id
        }
      };

      if (integrationId) {
        where.integrationId = integrationId;
      }

      if (olderThan) {
        try {
          const date = new Date(olderThan);
          where.createdAt = { lt: date };
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid date format for olderThan parameter' },
            { status: 400 }
          );
        }
      }

      const deleteResult = await prisma.calendarSyncEvent.deleteMany({ where });

      return NextResponse.json({
        success: true,
        deletedCount: deleteResult.count
      });
    }

    return NextResponse.json(
      { error: 'Either id, integrationId, or olderThan parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Delete sync events error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sync events' },
      { status: 500 }
    );
  }
}