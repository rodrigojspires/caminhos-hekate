import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EnhancedCalendarIntegrationService } from '@/lib/services/enhancedCalendarIntegration';
import { prisma } from '@hekate/database';
import { CalendarProvider as PrismaCalendarProvider, SyncStatus as PrismaSyncStatus } from '@prisma/client';

// POST /api/calendar/integrations/[id]/sync - Trigger manual sync
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify integration belongs to user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      );
    }

    if (!integration.syncEnabled) {
      return NextResponse.json(
        { error: 'Sync is disabled for this integration' },
        { status: 400 }
      );
    }

    // Check if sync is already in progress (prevent concurrent syncs)
    const recentSync = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        lastSyncAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      }
    });

    if (recentSync && !recentSync.syncError) {
      return NextResponse.json(
        { error: 'Sync already performed recently. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Perform sync
    const syncResult = await EnhancedCalendarIntegrationService.syncCalendar(params.id);
    
    return NextResponse.json({
      success: true,
      data: syncResult
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}

// GET /api/calendar/integrations/[id]/sync - Get sync status and history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify integration belongs to user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Map provider string to Prisma enum safely
    const providerKey = integration.provider.toUpperCase() as keyof typeof PrismaCalendarProvider;
    const providerEnum = PrismaCalendarProvider[providerKey];

    // Get sync statistics
    const syncedEvents = await prisma.eventSync.count({
      where: {
        provider: providerEnum,
        event: {
          createdBy: session.user.id
        }
      }
    });

    const failedSyncs = await prisma.eventSync.count({
      where: {
        provider: providerEnum,
        syncStatus: PrismaSyncStatus.FAILED,
        event: {
          createdBy: session.user.id
        }
      }
    });

    const lastSyncEvents = await prisma.eventSync.findMany({
      where: {
        provider: providerEnum,
        event: {
          createdBy: session.user.id
        }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        lastSyncAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        integration: {
          id: integration.id,
          provider: integration.provider,
          calendarName: integration.calendarName,
          isActive: integration.isActive,
          syncEnabled: integration.syncEnabled,
          lastSyncAt: integration.lastSyncAt,
          syncError: integration.syncError
        },
        statistics: {
          totalSyncedEvents: syncedEvents,
          failedSyncs,
          successRate: syncedEvents > 0 ? ((syncedEvents - failedSyncs) / syncedEvents * 100).toFixed(1) : '0'
        },
        recentSyncs: lastSyncEvents
      }
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}