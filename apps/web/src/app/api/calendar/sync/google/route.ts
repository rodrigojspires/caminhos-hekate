import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';
import { google } from 'googleapis';
import { EventStatus, SyncStatus } from '@prisma/client';

const syncRequestSchema = z.object({
  integrationId: z.string(),
  direction: z.enum(['import', 'export', 'bidirectional']).optional().default('bidirectional'),
  eventIds: z.array(z.string()).optional(), // Specific events to sync
});

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// Helper function to refresh Google access token
async function refreshGoogleToken(integration: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiresAt: new Date(credentials.expiry_date!),
      },
    });

    return credentials.access_token!;
  } catch (error) {
    console.error('Failed to refresh Google token:', error);
    throw new Error('Token refresh failed');
  }
}

// Helper function to get valid Google Calendar client
async function getGoogleCalendarClient(integration: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/auth/google/callback`
  );

  let accessToken = integration.accessToken;
  
  // Check if token needs refresh
  if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
    accessToken = await refreshGoogleToken(integration);
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: integration.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Helper function to convert Hekate event to Google Calendar event
function convertToGoogleEvent(event: any) {
  return {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: event.startDate.toISOString(),
      timeZone: event.timezone || 'UTC',
    },
    end: {
      dateTime: event.endDate.toISOString(),
      timeZone: event.timezone || 'UTC',
    },
    location: event.location || '',
    attendees: event.attendees?.map((attendee: any) => ({
      email: attendee.email,
      displayName: attendee.name,
    })) || [],
    reminders: {
      useDefault: false,
      overrides: event.reminders?.map((reminder: any) => ({
        method: 'popup',
        minutes: reminder.minutesBefore,
      })) || [],
    },
  };
}

// Helper function to convert Google Calendar event to Hekate event
function convertFromGoogleEvent(googleEvent: any, userId: string, categoryId?: string) {
  return {
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || '',
    startDate: new Date(googleEvent.start.dateTime || googleEvent.start.date),
    endDate: new Date(googleEvent.end.dateTime || googleEvent.end.date),
    timezone: googleEvent.start.timeZone || 'UTC',
    location: googleEvent.location || '',
    createdBy: userId,
    status: EventStatus.PUBLISHED
  };
}

// POST /api/calendar/sync/google - Sync events with Google Calendar
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
    const { integrationId, direction, eventIds } = syncRequestSchema.parse(body);

    // Get integration
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id,
        provider: 'GOOGLE',
        isActive: true,
        syncEnabled: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found or not active' },
        { status: 404 }
      );
    }

    const calendar = await getGoogleCalendarClient(integration);
    const calendarId = (integration.settings as any)?.calendarId || 'primary';
    
    let importedCount = 0;
    let exportedCount = 0;
    let conflictsCount = 0;
    const errors: string[] = [];

    // Import from Google Calendar
    if (direction === 'import' || direction === 'bidirectional') {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Next 90 days
          singleEvents: true,
          orderBy: 'startTime',
        });

        const googleEvents = response.data.items || [];
        
        for (const googleEvent of googleEvents) {
          if (!googleEvent.id || !googleEvent.start) continue;

          try {
            // Check if event already exists via sync mapping
            const existingSync = await prisma.calendarSyncEvent.findFirst({
              where: {
                integrationId: integration.id,
                externalId: googleEvent.id,
              },
              include: { event: true },
            });

            const existingEvent = existingSync?.event || null;
            const eventData = convertFromGoogleEvent(googleEvent, session.user.id);

            if (existingEvent) {
              // Check for conflicts
              const hasConflict = 
                existingEvent.title !== eventData.title ||
                existingEvent.startDate.getTime() !== eventData.startDate.getTime() ||
                existingEvent.endDate.getTime() !== eventData.endDate.getTime();

              if (hasConflict) {
                // Create conflict record
                await prisma.calendarConflict.create({
                  data: {
                    eventId: existingEvent.id,
                    integrationId: integration.id,
                    externalId: googleEvent.id,
                    conflictType: 'DATA_MISMATCH',
                    description: 'Event data mismatch detected during sync',
                    localData: {
                      title: existingEvent.title,
                      startDate: existingEvent.startDate,
                      endDate: existingEvent.endDate,
                    },
                    externalData: {
                      title: eventData.title,
                      startDate: eventData.startDate,
                      endDate: eventData.endDate,
                    },
                  },
                });
                conflictsCount++;
              } else {
                // Update existing event
                await prisma.event.update({
                  where: { id: existingEvent.id },
                  data: eventData,
                });
                importedCount++;
              }
            } else {
              // Create new event
              const newEvent = await prisma.event.create({
                data: eventData,
              });

              // Create sync record
              await prisma.calendarSyncEvent.create({
                data: {
                  eventId: newEvent.id,
                  integrationId: integration.id,
                  externalId: googleEvent.id,
                  operation: 'CREATE',
                  direction: 'IMPORT',
                  status: SyncStatus.SYNCED,
                },
              });
              importedCount++;
            }
          } catch (error) {
            console.error(`Failed to import event ${googleEvent.id}:`, error);
            errors.push(`Failed to import event: ${googleEvent.summary}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error);
        errors.push('Failed to fetch events from Google Calendar');
      }
    }

    // Export to Google Calendar
    if (direction === 'export' || direction === 'bidirectional') {
      try {
        const whereClause: any = {
          userId: session.user.id,
          startDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        };

        if (eventIds && eventIds.length > 0) {
          whereClause.id = { in: eventIds };
        }

        const hekateEvents = await prisma.event.findMany({
          where: whereClause,
          include: {
            reminders: true,
          },
        });

        for (const event of hekateEvents) {
          try {
            // Check if already synced
            const existingSync = await prisma.calendarSyncEvent.findFirst({
              where: {
                eventId: event.id,
                integrationId: integration.id,
              },
            });

            const googleEventData = convertToGoogleEvent(event);

            if (existingSync?.externalId) {
              // Update existing Google event
              await calendar.events.update({
                calendarId,
                eventId: existingSync.externalId,
                requestBody: googleEventData,
              });
            } else {
              // Create new Google event
              const response = await calendar.events.insert({
                calendarId,
                requestBody: googleEventData,
              });

              // Create sync record
              await prisma.calendarSyncEvent.create({
                data: {
                  eventId: event.id,
                  integrationId: integration.id,
                  externalId: response.data.id!,
                  operation: 'CREATE',
                  direction: 'EXPORT',
                  status: SyncStatus.SYNCED,
                },
              });
            }
            exportedCount++;
          } catch (error) {
            console.error(`Failed to export event ${event.id}:`, error);
            errors.push(`Failed to export event: ${event.title}`);
          }
        }
      } catch (error) {
        console.error('Failed to export events to Google Calendar:', error);
        errors.push('Failed to export events to Google Calendar');
      }
    }

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      summary: {
        imported: importedCount,
        exported: exportedCount,
        conflicts: conflictsCount,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
}

// GET /api/calendar/sync/google - Get sync status
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
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id,
        provider: 'GOOGLE',
      },
      include: {
        syncEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        conflicts: {
          where: { resolvedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      integration: {
        id: integration.id,
        provider: integration.provider,
        isActive: integration.isActive,
        syncEnabled: integration.syncEnabled,
        lastSyncAt: integration.lastSyncAt,
        settings: integration.settings,
      },
      recentSyncs: (integration as any).syncEvents,
      pendingConflicts: (integration as any).conflicts,
    });
  } catch (error) {
    console.error('Get Google sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}