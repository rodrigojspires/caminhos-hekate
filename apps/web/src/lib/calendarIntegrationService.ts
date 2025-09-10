import { CalendarEvent, CalendarIntegrationConfig, CalendarSyncResult, CalendarEventStatus, CalendarEventType, ReminderType } from '@/types/calendar'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  recurrence?: string[]
  status?: 'confirmed' | 'tentative' | 'cancelled'
  created?: string
  updated?: string
}

export interface OutlookCalendarEvent {
  id: string
  subject: string
  body?: {
    contentType: 'text' | 'html'
    content: string
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: {
    displayName: string
    address?: any
  }
  attendees?: Array<{
    emailAddress: {
      address: string
      name?: string
    }
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'
      time: string
    }
  }>
  isReminderOn?: boolean
  reminderMinutesBeforeStart?: number
  recurrence?: any
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  createdDateTime?: string
  lastModifiedDateTime?: string
}

export class CalendarIntegrationService {
  private config: CalendarIntegrationConfig
  private integrationId?: string

  constructor(config: CalendarIntegrationConfig, integrationId?: string) {
    this.config = config
    this.integrationId = integrationId
  }

  async syncEvents(): Promise<CalendarSyncResult> {
    try {
      switch (this.config.provider) {
        case 'google':
          return await this.syncGoogleCalendar()
        case 'outlook':
          return await this.syncOutlookCalendar()
        case 'apple':
          return await this.syncAppleCalendar()
        default:
          throw new Error(`Unsupported calendar provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Calendar sync error:', error)
      return {
        success: false,
        eventsImported: 0,
        eventsExported: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private async syncGoogleCalendar(): Promise<CalendarSyncResult> {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshToken()
          return await this.syncGoogleCalendar()
        }
        throw new Error(`Google Calendar API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const events: GoogleCalendarEvent[] = data.items || []
      
      return { success: true, eventsImported: events.length, eventsExported: 0, conflicts: [], errors: [] }
    } catch (error) {
      return {
        success: false,
        eventsImported: 0,
        eventsExported: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private async syncOutlookCalendar(): Promise<CalendarSyncResult> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/events`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshToken()
          return await this.syncOutlookCalendar()
        }
        throw new Error(`Outlook Calendar API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const events: OutlookCalendarEvent[] = data.value || []
      
      return { success: true, eventsImported: events.length, eventsExported: 0, conflicts: [], errors: [] }
    } catch (error) {
      return {
        success: false,
        eventsImported: 0,
        eventsExported: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private async syncAppleCalendar(): Promise<CalendarSyncResult> {
    // Apple Calendar uses CalDAV protocol - basic implementation
    return {
      success: true,
      eventsImported: 0,
      eventsExported: 0,
      conflicts: [],
      errors: []
    }
  }

  async importEvent(externalEvent: GoogleCalendarEvent | OutlookCalendarEvent): Promise<CalendarEvent> {
    if ('summary' in externalEvent) {
      const googleEvent = externalEvent as GoogleCalendarEvent
      return {
        id: googleEvent.id,
        title: googleEvent.summary,
        description: googleEvent.description || '',
        startDate: new Date(googleEvent.start.dateTime || googleEvent.start.date!),
        endDate: new Date(googleEvent.end.dateTime || googleEvent.end.date!),
        timezone: googleEvent.start.timeZone || googleEvent.end.timeZone,
        location: googleEvent.location || '',
        attendees: googleEvent.attendees?.map(a => a.email) || [],
        reminders: googleEvent.reminders?.overrides?.map((r, idx) => ({
          id: `${r.method}-${r.minutes}-${idx}`,
          type: r.method === 'email' ? ReminderType.EMAIL : ReminderType.IN_APP,
          minutes: r.minutes,
          method: r.method
        })) || [],
        type: googleEvent.start.date ? CalendarEventType.ALL_DAY : CalendarEventType.TIMED,
        status: (googleEvent.status === 'tentative')
          ? CalendarEventStatus.TENTATIVE
          : (googleEvent.status === 'cancelled')
            ? CalendarEventStatus.CANCELLED
            : CalendarEventStatus.CONFIRMED,
        recurrenceRule: googleEvent.recurrence?.[0],
        metadata: {
          googleCreatedAt: googleEvent.created,
          googleUpdatedAt: googleEvent.updated
        }
      }
    } else {
      const outlookEvent = externalEvent as OutlookCalendarEvent
      return {
        id: outlookEvent.id,
        title: outlookEvent.subject,
        description: outlookEvent.body?.content || '',
        startDate: new Date(outlookEvent.start.dateTime),
        endDate: new Date(outlookEvent.end.dateTime),
        timezone: outlookEvent.start.timeZone || outlookEvent.end.timeZone,
        location: outlookEvent.location?.displayName || '',
        attendees: outlookEvent.attendees?.map(a => a.emailAddress.address) || [],
        reminders: outlookEvent.isReminderOn ? [{
          id: `popup-${outlookEvent.reminderMinutesBeforeStart || 15}`,
          type: ReminderType.IN_APP,
          minutes: outlookEvent.reminderMinutesBeforeStart || 15,
          method: 'popup'
        }] : [],
        type: CalendarEventType.TIMED,
        status: CalendarEventStatus.CONFIRMED,
        recurrenceRule: outlookEvent.recurrence ? JSON.stringify(outlookEvent.recurrence) : undefined,
        metadata: {
          outlookCreatedAt: outlookEvent.createdDateTime,
          outlookUpdatedAt: outlookEvent.lastModifiedDateTime
        }
      }
    }
  }

  async exportEvent(event: CalendarEvent): Promise<void> {
    try {
      const response = await fetch(`/api/calendar/integrations/${this.integrationId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`
        },
        body: JSON.stringify({ event, provider: this.config.provider })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to export event: ${error.message}`)
      }
    } catch (error) {
      console.error('Error exporting event:', error)
      throw error
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const response = await fetch(`/api/calendar/integrations/${this.integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: true
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to refresh token: ${error.message}`)
      }
      
      const data = await response.json()
      if (data.success) {
        this.config.accessToken = data.data.accessToken
        if (data.data.refreshToken) {
          this.config.refreshToken = data.data.refreshToken
        }
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }
}

export function createCalendarIntegration(config: CalendarIntegrationConfig, integrationId?: string): CalendarIntegrationService {
  return new CalendarIntegrationService(config, integrationId)
}