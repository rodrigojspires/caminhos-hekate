import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';
import { SyncStatus } from '@prisma/client'

const syncRequestSchema = z.object({
  integrationId: z.string(),
  direction: z.enum(['import', 'export', 'bidirectional']).optional().default('bidirectional'),
  eventIds: z.array(z.string()).optional(), // Specific events to sync
});

const MICROSOFT_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_LOGIN_BASE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';

// Helper function to refresh Microsoft access token
async function refreshMicrosoftToken(integration: any) {
  try {
    const response = await fetch(`${MICROSOFT_LOGIN_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const tokens = await response.json();
    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Update tokens in database
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.refreshToken,
        tokenExpiresAt,
      },
    });

    return tokens.access_token;
  } catch (error) {
    console.error('Failed to refresh Microsoft token:', error);
    throw new Error('Token refresh failed');
  }
}

// Helper function to get valid Microsoft Graph API headers
async function getMicrosoftHeaders(integration: any) {
  let accessToken = integration.accessToken;
  
  // Check if token needs refresh
  if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
    accessToken = await refreshMicrosoftToken(integration);
  }

  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

// Helper function to convert Hekate event to Microsoft Graph event
function convertToMicrosoftEvent(event: any) {
  return {
    subject: event.title,
    body: {
      contentType: 'text',
      content: event.description || '',
    },
    start: {
      dateTime: event.startDate.toISOString(),
      timeZone: event.timeZone || 'UTC',
    },
    end: {
      dateTime: event.endDate.toISOString(),
      timeZone: event.timeZone || 'UTC',
    },
    location: {
      displayName: event.location || '',
    },
    attendees: event.attendees?.map((attendee: any) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name,
      },
      type: 'required',
    })) || [],
    isAllDay: event.isAllDay || false,
    showAs: 'busy',
    importance: 'normal',
  };
}

// Helper function to convert Microsoft Graph event to Hekate event
function convertFromMicrosoftEvent(microsoftEvent: any, userId: string) {
  return {
    title: microsoftEvent.subject || 'Untitled Event',
    description: microsoftEvent.body?.content || '',
    startDate: new Date(microsoftEvent.start.dateTime),
    endDate: new Date(microsoftEvent.end.dateTime),
    timezone: microsoftEvent.start.timeZone || 'America/Sao_Paulo',
    location: microsoftEvent.location?.displayName || '',
    status: 'PUBLISHED' as const,
    type: 'MEETING' as const,
    createdBy: userId,
    isPublic: true,
  };
}

// POST /api/calendar/sync/outlook - Sync events with Microsoft Calendar
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
        provider: 'OUTLOOK',
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

    const headers = await getMicrosoftHeaders(integration);
    const calendarId = (integration.settings as any)?.calendarId || 'calendar';
    
    let importedCount = 0;
    let exportedCount = 0;
    let conflictsCount = 0;
    const errors: string[] = [];

    // Import from Microsoft Calendar
    if (direction === 'import' || direction === 'bidirectional') {
      try {
        const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        const response = await fetch(
          `${MICROSOFT_GRAPH_BASE_URL}/me/calendar/calendarView?startDateTime=${startTime}&endDateTime=${endTime}&$orderby=start/dateTime`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Microsoft API error: ${response.status}`);
        }

        const data = await response.json();
        const microsoftEvents = data.value || [];
        
        for (const microsoftEvent of microsoftEvents) {
          if (!microsoftEvent.id || !microsoftEvent.start) continue;

          try {
            // Check if event already exists by external sync record
            const existingSync = await prisma.calendarSyncEvent.findFirst({
              where: {
                externalId: microsoftEvent.id,
                integrationId: integration.id,
              },
              include: {
                event: true,
              },
            });
            
            const existingEvent = existingSync?.event;

            const eventData = convertFromMicrosoftEvent(microsoftEvent, session.user.id);

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
                    externalId: microsoftEvent.id,
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
                  externalId: microsoftEvent.id,
                  operation: 'CREATE',
                  direction: 'IMPORT',
                  status: SyncStatus.SYNCED,
                },
              });
              importedCount++;
            }
          } catch (error) {
            console.error(`Failed to import event ${microsoftEvent.id}:`, error);
            errors.push(`Failed to import event: ${microsoftEvent.subject}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Microsoft Calendar events:', error);
        errors.push('Failed to fetch events from Microsoft Calendar');
      }
    }

    // Export to Microsoft Calendar
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

            const microsoftEventData = convertToMicrosoftEvent(event);

            if (existingSync?.externalId) {
              // Update existing Microsoft event
              const response = await fetch(
                `${MICROSOFT_GRAPH_BASE_URL}/me/events/${existingSync.externalId}`,
                {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify(microsoftEventData),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to update Microsoft event: ${response.status}`);
              }
            } else {
              // Create new Microsoft event
              const response = await fetch(
                `${MICROSOFT_GRAPH_BASE_URL}/me/events`,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(microsoftEventData),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to create Microsoft event: ${response.status}`);
              }

              const createdEvent = await response.json();

              // Create sync record
              await prisma.calendarSyncEvent.create({
                data: {
                  eventId: event.id,
                  integrationId: integration.id,
                  externalId: createdEvent.id,
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
        console.error('Failed to export events to Microsoft Calendar:', error);
        errors.push('Failed to export events to Microsoft Calendar');
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
    console.error('Microsoft Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Microsoft Calendar' },
      { status: 500 }
    );
  }
}

// GET /api/calendar/sync/outlook - Get sync status
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
        provider: 'OUTLOOK',
      },

    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Buscar eventos de sincronização separadamente
    const recentSyncs = await prisma.calendarSyncEvent.findMany({
      where: {
        integrationId: integration.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Buscar conflitos pendentes separadamente
    const pendingConflicts = await prisma.calendarConflict.findMany({
      where: {
        integrationId: integration.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        provider: integration.provider,
        isActive: integration.isActive,
        syncEnabled: integration.syncEnabled,
        lastSyncAt: integration.lastSyncAt,
        settings: integration.settings,
      },
      recentSyncs,
      pendingConflicts,
    });
  } catch (error) {
    console.error('Get Microsoft sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}