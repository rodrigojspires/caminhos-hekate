import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@hekate/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CalendarIntegrationService } from '@/lib/services/calendarIntegrationService';
import { CalendarProvider, SyncStatus, EventRegistrationStatus } from '@prisma/client';
import { CalendarEvent as WebCalendarEvent, EventType as WebEventType, EventStatus as WebEventStatus } from '@/types/events';

// Validation schemas
const syncEventSchema = z.object({
  eventId: z.string().cuid(),
  provider: z.enum(['google', 'outlook']),
  action: z.enum(['create', 'update', 'delete']),
  externalEventId: z.string().optional()
});

const bulkSyncSchema = z.object({
  provider: z.enum(['google', 'outlook']),
  eventIds: z.array(z.string().cuid()).max(50), // Limit bulk operations
  action: z.enum(['create', 'update', 'delete'])
});

const syncStatusSchema = z.object({
  eventId: z.string().cuid().optional(),
  provider: z.enum(['google', 'outlook']).optional()
});

// Helper mappers
const toPrismaProvider = (p: 'google' | 'outlook'): CalendarProvider => (p === 'google' ? CalendarProvider.GOOGLE : CalendarProvider.OUTLOOK);


// POST /api/events/sync - Sync single event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId, provider, action, externalEventId } = syncEventSchema.parse(body);

    // Get the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: true,
        registrations: {
          include: {
            user: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to sync this event
    const isCreator = event.createdBy === session.user.id;
    const isRegistered = event.registrations.some(
      reg => reg.userId === session.user.id && reg.status === EventRegistrationStatus.CONFIRMED
    );

    if (!isCreator && !isRegistered) {
      return NextResponse.json(
        { error: 'Forbidden - You can only sync events you created or are registered for' },
        { status: 403 }
      );
    }

    let syncSuccess = false;

    try {
      // Convert Prisma event to CalendarEvent format used by frontend/service
      const calendarEvent: WebCalendarEvent = {
        id: event.id,
        title: event.title,
        description: event.description ?? undefined,
        start: event.startDate,
        end: event.endDate,
        location: event.location ?? undefined,
        virtualLink: event.virtualLink ?? undefined,
        type: event.type as unknown as WebEventType,
        status: event.status as unknown as WebEventStatus,
        attendeeCount: event.registrations.length,
        maxAttendees: event.maxAttendees ?? undefined
      };

      switch (action) {
        case 'create':
          if (provider === 'google') {
            syncSuccess = await CalendarIntegrationService.addToGoogleCalendar(calendarEvent);
          } else if (provider === 'outlook') {
            syncSuccess = await CalendarIntegrationService.addToOutlookCalendar(calendarEvent);
          }
          break;

        case 'update':
          if (provider === 'google' && externalEventId) {
            syncSuccess = await CalendarIntegrationService.updateGoogleCalendarEvent(
              externalEventId, 
              calendarEvent
            );
          }
          break;

        case 'delete':
          if (provider === 'google' && externalEventId) {
            syncSuccess = await CalendarIntegrationService.deleteGoogleCalendarEvent(externalEventId);
          }
          break;
      }

      // Store sync record
      if (syncSuccess) {
        const providerEnum = toPrismaProvider(provider);
        const extId = externalEventId ?? undefined;
        if (extId) {
          await prisma.eventSync.upsert({
            where: {
              eventId_provider: {
                eventId: event.id,
                provider: providerEnum
              }
            },
            update: {
              externalId: extId,
              lastSyncAt: new Date(),
              syncStatus: SyncStatus.SYNCED
            },
            create: {
              eventId: event.id,
              provider: providerEnum,
              externalId: extId,
              lastSyncAt: new Date(),
              syncStatus: SyncStatus.SYNCED
            }
          });
        } else {
          await prisma.eventSync.updateMany({
            where: { eventId: event.id, provider: providerEnum },
            data: { lastSyncAt: new Date(), syncStatus: SyncStatus.SYNCED }
          });
        }
      }

    } catch (syncError) {
      console.error('Sync error:', syncError);
      
      // Update sync status to failed (update existing records only)
      await prisma.eventSync.updateMany({
        where: {
          eventId: event.id,
          provider: toPrismaProvider(provider)
        },
        data: {
          syncStatus: SyncStatus.FAILED,
          lastSyncAt: new Date()
        }
      });

      return NextResponse.json(
        { error: 'Sync failed', details: syncError instanceof Error ? syncError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: syncSuccess,
      eventId: event.id,
      provider: provider,
      action: action,
      externalEventId: externalEventId ?? undefined
    });

  } catch (error) {
    console.error('Sync API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/events/sync - Bulk sync events
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider, eventIds, action } = bulkSyncSchema.parse(body);

    // Get events
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        OR: [
          { createdBy: session.user.id },
          {
            registrations: {
              some: {
                userId: session.user.id,
                status: EventRegistrationStatus.CONFIRMED
              }
            }
          }
        ]
      },
      include: {
        creator: true,
        registrations: {
          include: { user: true }
        }
      }
    });

    const results: Array<{ eventId: string; success: boolean; title: string; error?: string }> = [];

    for (const event of events) {
      try {
        const calendarEvent: WebCalendarEvent = {
          id: event.id,
          title: event.title,
          description: event.description ?? undefined,
          start: event.startDate,
          end: event.endDate,
          location: event.location ?? undefined,
          virtualLink: event.virtualLink ?? undefined,
          type: event.type as unknown as WebEventType,
          status: event.status as unknown as WebEventStatus,
          attendeeCount: event.registrations.length,
          maxAttendees: event.maxAttendees ?? undefined
        };

        let success = false;

        if (action === 'create') {
          if (provider === 'google') {
            success = await CalendarIntegrationService.addToGoogleCalendar(calendarEvent);
          } else if (provider === 'outlook') {
            success = await CalendarIntegrationService.addToOutlookCalendar(calendarEvent);
          }
        }

        // Update sync status
        if (success) {
          await prisma.eventSync.updateMany({
            where: {
              eventId: event.id,
              provider: toPrismaProvider(provider)
            },
            data: {
              lastSyncAt: new Date(),
              syncStatus: SyncStatus.SYNCED
            }
          });
        }

        results.push({
          eventId: event.id,
          success: success,
          title: event.title
        });

      } catch (error) {
        results.push({
          eventId: event.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          title: event.title
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Bulk sync API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/events/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const provider = searchParams.get('provider') as 'google' | 'outlook' | null;

    const query = syncStatusSchema.parse({
      eventId: eventId || undefined,
      provider: provider || undefined
    });

    const where: any = {};

    if (query.eventId) {
      where.eventId = query.eventId;
    }

    if (query.provider) {
      where.provider = toPrismaProvider(query.provider);
    }

    // Restrict to events the user can access
    where.event = {
      OR: [
        { createdBy: session.user.id },
        { registrations: { some: { userId: session.user.id, status: EventRegistrationStatus.CONFIRMED } } }
      ]
    };

    const syncRecords = await prisma.eventSync.findMany({
      where,
      include: {
        event: {
          select: { id: true, title: true, startDate: true, endDate: true, type: true }
        }
      },
      orderBy: { lastSyncAt: 'desc' }
    });

    // Get summary statistics
    const summary = {
      total: syncRecords.length,
      synced: syncRecords.filter(r => r.syncStatus === SyncStatus.SYNCED).length,
      failed: syncRecords.filter(r => r.syncStatus === SyncStatus.FAILED).length,
      pending: syncRecords.filter(r => r.syncStatus === SyncStatus.PENDING).length,
      byProvider: {
        google: syncRecords.filter(r => r.provider === CalendarProvider.GOOGLE).length,
        outlook: syncRecords.filter(r => r.provider === CalendarProvider.OUTLOOK).length
      }
    };

    return NextResponse.json({
      syncRecords: syncRecords.map(record => ({
        id: record.id,
        eventId: record.eventId,
        provider: record.provider === CalendarProvider.GOOGLE ? 'google' : 'outlook',
        externalEventId: record.externalId ?? undefined,
        syncStatus: record.syncStatus,
        lastSyncAt: record.lastSyncAt,
        createdAt: record.createdAt,
        event: record.event
      })),
      summary
    });

  } catch (error) {
    console.error('Get sync status API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/sync - Remove sync relationship
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const provider = searchParams.get('provider') as 'google' | 'outlook';

    if (!eventId || !provider) {
      return NextResponse.json(
        { error: 'eventId and provider are required' },
        { status: 400 }
      );
    }

    const syncRecord = await prisma.eventSync.findUnique({
      where: {
        eventId_provider: {
          eventId: eventId,
          provider: toPrismaProvider(provider)
        }
      },
      include: {
        event: {
          select: { createdBy: true, registrations: { select: { userId: true, status: true } } }
        }
      }
    });

    if (!syncRecord) {
      return NextResponse.json(
        { error: 'Sync record not found' },
        { status: 404 }
      );
    }

    // Permission check
    const canDelete = syncRecord.event.createdBy === session.user.id ||
      syncRecord.event.registrations.some(r => r.userId === session.user.id && r.status === EventRegistrationStatus.CONFIRMED);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - You can only modify syncs for events you created or are registered for' },
        { status: 403 }
      );
    }

    // Try to delete from external calendar if we have the external event ID
    if (syncRecord.externalId) {
      try {
        if (provider === 'google') {
          await CalendarIntegrationService.deleteGoogleCalendarEvent(syncRecord.externalId);
        }
        // Outlook deletion would go here when implemented
      } catch (error) {
        console.warn('Failed to delete from external calendar:', error);
      }
    }

    await prisma.eventSync.delete({ where: { id: syncRecord.id } });

    return NextResponse.json({ success: true, message: 'Sync relationship removed' });

  } catch (error) {
    console.error('Delete sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}