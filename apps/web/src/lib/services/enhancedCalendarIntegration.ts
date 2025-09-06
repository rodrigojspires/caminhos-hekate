import { CalendarEvent } from '@/types/calendar';
import { toast } from 'sonner';
import { prisma } from '@hekate/database';
import { CalendarProvider as PrismaCalendarProvider, SyncStatus as PrismaSyncStatus } from '@prisma/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CalendarProvider {
  id: 'google' | 'outlook' | 'apple';
  name: string;
  icon: string;
  color: string;
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: CalendarProvider['id'];
  accessToken: string;
  refreshToken?: string;
  externalCalendarId: string;
  calendarName: string;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  syncError?: string;
  settings: CalendarSyncSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarSyncSettings {
  syncDirection: 'import' | 'export' | 'bidirectional';
  syncPrivateEvents: boolean;
  syncRecurringEvents: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
  eventCategories: string[];
  reminderSettings: {
    enabled: boolean;
    defaultMinutes: number[];
  };
  // Selected external calendar identifier (stored in DB settings JSON)
  defaultCalendarId?: string;
}

export interface SyncResult {
  success: boolean;
  imported: number;
  exported: number;
  updated: number;
  errors: string[];
  conflicts: ConflictEvent[];
}

export interface ConflictEvent {
  localEvent: CalendarEvent;
  remoteEvent: any;
  conflictType: 'time' | 'content' | 'deletion';
  resolution?: 'local' | 'remote';
}

// ============================================================================
// ENHANCED GOOGLE CALENDAR INTEGRATION
// ============================================================================

class EnhancedGoogleCalendarIntegration {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback';
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID!,
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPES,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  static async getCalendars(accessToken: string): Promise<any[]> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.items || [];
  }

  static async getEvents(accessToken: string, calendarId: string, timeMin?: Date, timeMax?: Date): Promise<any[]> {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    if (timeMin) params.set('timeMin', timeMin.toISOString());
    if (timeMax) params.set('timeMax', timeMax.toISOString());

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.items || [];
  }

  static async createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<any> {
    const googleEvent = this.convertToGoogleEvent(event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEvent)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    return await response.json();
  }

  static async updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<any> {
    const googleEvent = this.convertToGoogleEvent(event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEvent)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update event');
    }

    return await response.json();
  }

  static async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  }

  private static convertToGoogleEvent(event: CalendarEvent): any {
    return {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime ? event.startTime.toISOString() : event.startDate.toISOString(),
        timeZone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endTime ? event.endTime.toISOString() : event.endDate.toISOString(),
        timeZone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location,
      attendees: event.attendees ? event.attendees.map(email => ({ email })) : undefined,
      reminders: {
        useDefault: false,
        overrides: event.reminders ? event.reminders.map(r => ({ method: r.method, minutes: r.minutes })) : [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };
  }

  static convertFromGoogleEvent(googleEvent: any): Partial<CalendarEvent> {
    const startDate = new Date(googleEvent.start.dateTime || googleEvent.start.date);
    const endDate = new Date(googleEvent.end.dateTime || googleEvent.end.date);
    
    return {
      title: googleEvent.summary,
      description: googleEvent.description,
      startDate,
      endDate,
      startTime: googleEvent.start.dateTime ? startDate : undefined,
      endTime: googleEvent.end.dateTime ? endDate : undefined,
      location: googleEvent.location,
      timezone: googleEvent.start.timeZone,
      isAllDay: !googleEvent.start.dateTime,
      attendees: googleEvent.attendees ? googleEvent.attendees.map((a: any) => a.email) : undefined
    };
  }
}

// ============================================================================
// ENHANCED OUTLOOK CALENDAR INTEGRATION
// ============================================================================

class EnhancedOutlookCalendarIntegration {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/outlook/callback';
  private static readonly SCOPES = [
    'https://graph.microsoft.com/calendars.readwrite',
    'https://graph.microsoft.com/user.read'
  ].join(' ');

  static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID!,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPES,
      state
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  static async getCalendars(accessToken: string): Promise<any[]> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.value || [];
  }

  static async getEvents(accessToken: string, calendarId: string, startTime?: Date, endTime?: Date): Promise<any[]> {
    let url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`;
    
    if (startTime && endTime) {
      const filter = `start/dateTime ge '${startTime.toISOString()}' and end/dateTime le '${endTime.toISOString()}'`;
      url += `?$filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.value || [];
  }

  static async createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<any> {
    const outlookEvent = this.convertToOutlookEvent(event);

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(outlookEvent)
    });

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    return await response.json();
  }

  static async updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<any> {
    const outlookEvent = this.convertToOutlookEvent(event);

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(outlookEvent)
    });

    if (!response.ok) {
      throw new Error('Failed to update event');
    }

    return await response.json();
  }

  static async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  }

  private static convertToOutlookEvent(event: CalendarEvent): any {
    return {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.startTime ? event.startTime.toISOString() : event.startDate.toISOString(),
        timeZone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endTime ? event.endTime.toISOString() : event.endDate.toISOString(),
        timeZone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location ? {
        displayName: event.location
      } : undefined,
      attendees: event.attendees ? event.attendees.map(email => ({
        emailAddress: { address: email }
      })) : undefined,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 30
    };
  }

  static convertFromOutlookEvent(outlookEvent: any): Partial<CalendarEvent> {
    const startDate = new Date(outlookEvent.start.dateTime);
    const endDate = new Date(outlookEvent.end.dateTime);
    
    return {
      title: outlookEvent.subject,
      description: outlookEvent.body?.content,
      startDate,
      endDate,
      startTime: startDate,
      endTime: endDate,
      location: outlookEvent.location?.displayName,
      timezone: outlookEvent.start.timeZone,
      attendees: outlookEvent.attendees ? outlookEvent.attendees.map((a: any) => a.emailAddress.address) : undefined
    };
  }
}

// ============================================================================
// MAIN ENHANCED CALENDAR INTEGRATION SERVICE
// ============================================================================

export class EnhancedCalendarIntegrationService {
  static readonly PROVIDERS: CalendarProvider[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: '📅',
      color: '#4285f4'
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      icon: '📆',
      color: '#0078d4'
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      icon: '🍎',
      color: '#007aff'
    }
  ];

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  static getAuthUrl(provider: CalendarProvider['id'], userId: string): string {
    const state = Buffer.from(JSON.stringify({ provider, userId })).toString('base64');
    
    switch (provider) {
      case 'google':
        return EnhancedGoogleCalendarIntegration.getAuthUrl(state);
      case 'outlook':
        return EnhancedOutlookCalendarIntegration.getAuthUrl(state);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  static async handleAuthCallback(provider: CalendarProvider['id'], code: string, state: string): Promise<CalendarIntegration> {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    
    let tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    let calendars: any[];
    
    switch (provider) {
      case 'google':
        tokens = await EnhancedGoogleCalendarIntegration.exchangeCodeForTokens(code);
        calendars = await EnhancedGoogleCalendarIntegration.getCalendars(tokens.accessToken);
        break;
      case 'outlook':
        tokens = await EnhancedOutlookCalendarIntegration.exchangeCodeForTokens(code);
        calendars = await EnhancedOutlookCalendarIntegration.getCalendars(tokens.accessToken);
        break;
      default:
        throw new Error(`Provider ${provider} not supported`);
    }

    // Use primary calendar by default
    const primaryCalendar = calendars.find(cal => cal.primary || cal.isDefaultCalendar) || calendars[0];
    
    if (!primaryCalendar) {
      throw new Error('No calendar found');
    }

    // Save integration to database
    const created = await prisma.calendarIntegration.create({
      data: {
        userId,
        provider: EnhancedCalendarIntegrationService.mapProviderToPrisma(provider),
        providerAccountId: primaryCalendar.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        calendarName: primaryCalendar.summary || primaryCalendar.name,
        isActive: true,
        syncEnabled: true,
        settings: {
          syncDirection: 'bidirectional',
          syncPrivateEvents: false,
          syncRecurringEvents: true,
          conflictResolution: 'manual',
          eventCategories: [],
          reminderSettings: {
            enabled: true,
            defaultMinutes: [30, 1440] // 30 minutes and 1 day
          },
          defaultCalendarId: primaryCalendar.id
        },
        user: { connect: { id: userId } }
      }
    });

    // Construct local integration representation
    const localIntegration: CalendarIntegration = {
      id: created.id,
      userId,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      externalCalendarId: primaryCalendar.id,
      calendarName: primaryCalendar.summary || primaryCalendar.name,
      isActive: true,
      syncEnabled: true,
      lastSyncAt: undefined,
      syncError: undefined,
      settings: {
        syncDirection: 'bidirectional',
        syncPrivateEvents: false,
        syncRecurringEvents: true,
        conflictResolution: 'manual',
        eventCategories: [],
        reminderSettings: { enabled: true, defaultMinutes: [30, 1440] },
        defaultCalendarId: primaryCalendar.id
      },
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };

    return localIntegration;
  }

  // ============================================================================
  // SYNC METHODS
  // ============================================================================

  static async syncCalendar(integrationId: string): Promise<SyncResult> {
    const integrationRecord = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integrationRecord || !integrationRecord.isActive) {
      throw new Error('Integration not found or inactive');
    }

    const serviceIntegration: CalendarIntegration = {
      id: integrationRecord.id,
      userId: integrationRecord.userId,
      provider: EnhancedCalendarIntegrationService.mapPrismaProviderToId(integrationRecord.provider as PrismaCalendarProvider),
      accessToken: integrationRecord.accessToken,
      refreshToken: integrationRecord.refreshToken || undefined,
      externalCalendarId: (integrationRecord as any).externalCalendarId,
      calendarName: (integrationRecord as any).calendarName,
      isActive: integrationRecord.isActive,
      syncEnabled: (integrationRecord as any).syncEnabled,
      lastSyncAt: integrationRecord.lastSyncAt || undefined,
      syncError: integrationRecord.syncError || undefined,
      settings: (integrationRecord.settings as unknown) as CalendarSyncSettings,
      createdAt: integrationRecord.createdAt,
      updatedAt: integrationRecord.updatedAt
    };

    const result: SyncResult = {
      success: false,
      imported: 0,
      exported: 0,
      updated: 0,
      errors: [],
      conflicts: []
    };

    try {
      // Refresh token if needed
      let accessToken = serviceIntegration.accessToken;
      try {
        accessToken = await this.refreshTokenIfNeeded(serviceIntegration);
      } catch (error) {
        result.errors.push('Failed to refresh access token');
        return result;
      }

      const settings = serviceIntegration.settings as unknown as CalendarSyncSettings;
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Import events from external calendar
      if (settings.syncDirection === 'import' || settings.syncDirection === 'bidirectional') {
        const importResult = await this.importEvents(serviceIntegration, accessToken, oneMonthAgo, oneMonthFromNow);
        result.imported = importResult.imported;
        result.errors.push(...importResult.errors);
        result.conflicts.push(...importResult.conflicts);
      }

      // Export events to external calendar
      if (settings.syncDirection === 'export' || settings.syncDirection === 'bidirectional') {
        const exportResult = await this.exportEvents(serviceIntegration, accessToken, oneMonthAgo, oneMonthFromNow);
        result.exported = exportResult.exported;
        result.updated = exportResult.updated;
        result.errors.push(...exportResult.errors);
      }

      // Update last sync time
      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          syncError: result.errors.length > 0 ? result.errors.join('; ') : null
        }
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private static async refreshTokenIfNeeded(integration: CalendarIntegration): Promise<string> {
    // Check if token needs refresh (implement token expiry logic)
    if (!integration.refreshToken) {
      return integration.accessToken;
    }

    try {
      let newAccessToken: string;
      
      switch (integration.provider) {
        case 'google':
          newAccessToken = await EnhancedGoogleCalendarIntegration.refreshAccessToken(integration.refreshToken);
          break;
        case 'outlook':
          newAccessToken = await EnhancedOutlookCalendarIntegration.refreshAccessToken(integration.refreshToken);
          break;
        default:
          return integration.accessToken;
      }

      // Update token in database
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { accessToken: newAccessToken }
      });

      return newAccessToken;
    } catch (error) {
      throw new Error('Failed to refresh access token');
    }
  }

  private static async importEvents(
    integration: CalendarIntegration,
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ imported: number; errors: string[]; conflicts: ConflictEvent[] }> {
    const result: { imported: number; errors: string[]; conflicts: ConflictEvent[] } = { imported: 0, errors: [], conflicts: [] };
    
    try {
      let externalEvents: any[];
      
      switch (integration.provider) {
        case 'google':
          externalEvents = await EnhancedGoogleCalendarIntegration.getEvents(
            accessToken,
            integration.externalCalendarId,
            startTime,
            endTime
          );
          break;
        case 'outlook':
          externalEvents = await EnhancedOutlookCalendarIntegration.getEvents(
            accessToken,
            integration.externalCalendarId,
            startTime,
            endTime
          );
          break;
        default:
          return result;
      }

       for (const externalEvent of externalEvents) {
         try {
           // Check if this event was previously synced
           const existingSync = await prisma.eventSync.findFirst({
             where: {
               externalId: externalEvent.id,
               provider: EnhancedCalendarIntegrationService.mapProviderToPrisma(integration.provider)
             },
             include: { event: true }
           });

           if (existingSync) {
             // Update existing event if needed
             const updatedEventData = this.convertExternalEventToLocal(externalEvent, integration.provider);
             
             await prisma.event.update({
               where: { id: existingSync.eventId },
               data: updatedEventData as any
             });
           } else {
             // Create new event
             const eventData = this.convertExternalEventToLocal(externalEvent, integration.provider);
             
             const newEvent = await prisma.event.create({
               data: {
                 ...eventData,
                 createdBy: integration.userId,
                 isPublic: false // Imported events are private by default
               } as any
             });

             // Create sync record
             await prisma.eventSync.create({
               data: {
                 eventId: newEvent.id,
                 provider: EnhancedCalendarIntegrationService.mapProviderToPrisma(integration.provider),
                 externalId: externalEvent.id,
                 syncStatus: PrismaSyncStatus.SYNCED,
                 lastSyncAt: new Date()
               }
             });

             result.imported++;
           }
         } catch (error) {
           result.errors.push(`Failed to import event ${externalEvent.id}: ${error}`);
         }
       }
     } catch (error) {
       result.errors.push(`Failed to fetch external events: ${error}`);
     }

     return result;
   }

   private static async exportEvents(
     integration: CalendarIntegration,
     accessToken: string,
     startTime: Date,
     endTime: Date
   ): Promise<{ exported: number; updated: number; errors: string[] }> {
    const result: { exported: number; updated: number; errors: string[] } = { exported: 0, updated: 0, errors: [] };
    
    try {
      // Get local events that need to be exported
       const localEvents = await prisma.event.findMany({
         where: {
           createdBy: integration.userId,
           startDate: {
             gte: startTime,
             lte: endTime
           },
           isPublic: true // Only export public events
         },
         include: {
           syncs: {
             where: {
               provider: EnhancedCalendarIntegrationService.mapProviderToPrisma(integration.provider)
             }
           }
         }
       });

       for (const localEvent of localEvents) {
         try {
           const existingSync = localEvent.syncs[0];
           
           if (existingSync) {
             // Update existing external event
             switch (integration.provider) {
               case 'google':
                 await EnhancedGoogleCalendarIntegration.updateEvent(
                   accessToken,
                   integration.externalCalendarId,
                   existingSync.externalId,
                   localEvent as unknown as CalendarEvent
                 );
                 break;
               case 'outlook':
                 await EnhancedOutlookCalendarIntegration.updateEvent(
                   accessToken,
                   integration.externalCalendarId,
                   existingSync.externalId,
                   localEvent as unknown as CalendarEvent
                 );
                 break;
             }
             
             result.updated++;
           } else {
             // Create new external event
             let externalEvent: any;
             
             switch (integration.provider) {
               case 'google':
                 externalEvent = await EnhancedGoogleCalendarIntegration.createEvent(
                   accessToken,
                   integration.externalCalendarId,
                   localEvent as unknown as CalendarEvent
                 );
                 break;
               case 'outlook':
                 externalEvent = await EnhancedOutlookCalendarIntegration.createEvent(
                   accessToken,
                   integration.externalCalendarId,
                   localEvent as unknown as CalendarEvent
                 );
                 break;
             }

             if (externalEvent) {
               // Create sync record
               await prisma.eventSync.create({
                 data: {
                   eventId: localEvent.id,
                   provider: EnhancedCalendarIntegrationService.mapProviderToPrisma(integration.provider),
                   externalId: externalEvent.id,
                   syncStatus: PrismaSyncStatus.SYNCED,
                   lastSyncAt: new Date()
                 }
               });
               
               result.exported++;
             }
           }
         } catch (error) {
           result.errors.push(`Failed to export event ${localEvent.id}: ${error}`);
         }
       }
     } catch (error) {
       result.errors.push(`Failed to export events: ${error}`);
     }

     return result;
   }

   private static convertExternalEventToLocal(externalEvent: any, provider: CalendarProvider['id']): Partial<CalendarEvent> {
     switch (provider) {
       case 'google':
         return EnhancedGoogleCalendarIntegration.convertFromGoogleEvent(externalEvent);
       case 'outlook':
         return EnhancedOutlookCalendarIntegration.convertFromOutlookEvent(externalEvent);
       default:
         throw new Error(`Provider ${provider} not supported`);
     }
   }

   // ============================================================================
   // UTILITY METHODS
   // ============================================================================

   private static mapProviderToPrisma(provider: CalendarProvider['id']): PrismaCalendarProvider {
     switch (provider) {
       case 'google':
         return PrismaCalendarProvider.GOOGLE;
       case 'outlook':
         return PrismaCalendarProvider.OUTLOOK;
       case 'apple':
         return PrismaCalendarProvider.APPLE;
       default:
         return PrismaCalendarProvider.GOOGLE;
     }
   }

   private static mapPrismaProviderToId(provider: PrismaCalendarProvider): CalendarProvider['id'] {
     switch (provider) {
       case PrismaCalendarProvider.GOOGLE:
         return 'google';
       case PrismaCalendarProvider.OUTLOOK:
         return 'outlook';
       case PrismaCalendarProvider.APPLE:
         return 'apple';
       default:
         return 'google';
     }
   }

   static async getUserIntegrations(userId: string): Promise<CalendarIntegration[]> {
     const integrations = await prisma.calendarIntegration.findMany({
       where: { userId },
       orderBy: { createdAt: 'desc' }
     });

     return integrations.map((rec: any) => {
       const settings = (rec.settings || {}) as CalendarSyncSettings;
       const providerId = EnhancedCalendarIntegrationService.mapPrismaProviderToId(rec.provider as PrismaCalendarProvider);
       return {
         id: rec.id,
         userId: rec.userId,
         provider: providerId,
         accessToken: rec.accessToken,
         refreshToken: rec.refreshToken || undefined,
         externalCalendarId: settings?.defaultCalendarId || '',
         calendarName: rec.calendarName,
         isActive: rec.isActive,
         syncEnabled: rec.syncEnabled,
         lastSyncAt: rec.lastSyncAt || undefined,
         syncError: rec.syncError || undefined,
         settings: settings,
         createdAt: rec.createdAt,
         updatedAt: rec.updatedAt
       } as CalendarIntegration;
     });
   }

   static async deleteIntegration(integrationId: string): Promise<void> {
     await prisma.calendarIntegration.delete({
       where: { id: integrationId }
     });
   }

   static async updateIntegrationSettings(integrationId: string, settings: Partial<CalendarSyncSettings>): Promise<void> {
     const integration = await prisma.calendarIntegration.findUnique({
       where: { id: integrationId }
     });

     if (!integration) {
       throw new Error('Integration not found');
     }

     const updatedSettings = {
       ...(integration.settings as unknown as CalendarSyncSettings),
       ...settings
     };

     await prisma.calendarIntegration.update({
       where: { id: integrationId },
       data: { settings: updatedSettings }
     });
   }

   static async toggleIntegration(integrationId: string, isActive: boolean): Promise<void> {
     await prisma.calendarIntegration.update({
       where: { id: integrationId },
       data: { isActive }
     });
   }
}

export default EnhancedCalendarIntegrationService;