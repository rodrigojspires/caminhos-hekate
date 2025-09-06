import { CalendarEvent, CalendarEventType, CalendarEventStatus, ReminderType as AppReminderType } from '@/types/calendar';
import { GoogleCalendarEvent, OutlookCalendarEvent } from '@/lib/calendarIntegrationService';
import { EventType, EventStatus } from '@prisma/client';

/**
 * Privacy settings for event transformation
 */
export interface PrivacySettings {
  enabled: boolean;
  defaultVisibility: 'public' | 'private' | 'confidential';
  syncPrivateEvents: boolean;
  syncConfidentialEvents: boolean;
  anonymizePrivateEvents: boolean;
  fieldSettings: {
    title: { sync: boolean; anonymize: boolean; placeholder?: string };
    description: { sync: boolean; anonymize: boolean; placeholder?: string };
    location: { sync: boolean; anonymize: boolean; placeholder?: string };
    attendees: { sync: boolean; anonymize: boolean; placeholder?: string };
  };
  keywordFiltering: {
    enabled: boolean;
    mode: 'exclude' | 'includeOnly';
    keywords: string[];
  };
  timeSettings: {
    syncDuration: { past: number; future: number };
    syncBusyStatus: boolean;
    roundToHour: boolean;
  };
  advancedRules: Array<{
    id: string;
    field: 'title' | 'description' | 'location' | 'attendees' | 'category';
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
    action: 'exclude' | 'anonymize' | 'includeOnly';
  }>;
}

/**
 * Transformation result
 */
export interface TransformationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Calendar data transformer utility
 */
export class CalendarDataTransformer {
  /**
   * Transform internal CalendarEvent to Google Calendar format
   */
  static toGoogleCalendarEvent(
    event: CalendarEvent,
    privacySettings?: PrivacySettings
  ): TransformationResult<GoogleCalendarEvent> {
    try {
      const warnings: string[] = [];
      
      // Apply privacy filters
      if (privacySettings?.enabled) {
        const filterResult = this.applyPrivacyFilters(event, privacySettings);
        if (!filterResult.allowed) {
          return {
            success: false,
            error: 'Event filtered out by privacy settings'
          };
        }
        if (filterResult.warnings) {
          warnings.push(...filterResult.warnings);
        }
      }

      const processedEvent = privacySettings?.enabled 
        ? this.applyPrivacyTransformations(event, privacySettings)
        : event;

      const googleEvent: GoogleCalendarEvent = {
        id: processedEvent.externalId || '',
        summary: processedEvent.title,
        description: processedEvent.description || undefined,
        location: processedEvent.location || undefined,
        start: {
          dateTime: processedEvent.startTime?.toISOString() || new Date().toISOString(),
          timeZone: processedEvent.timezone || 'UTC'
        },
        end: {
          dateTime: processedEvent.endTime?.toISOString() || new Date().toISOString(),
          timeZone: processedEvent.timezone || 'UTC'
        },
        attendees: processedEvent.attendees?.map(email => ({ email })),
        // Note: Google Calendar API doesn't support visibility property directly
        status: this.mapStatusToGoogle(processedEvent.status) as 'confirmed' | 'tentative' | 'cancelled' | undefined,
        recurrence: processedEvent.recurrenceRule ? [processedEvent.recurrenceRule] : undefined,
        reminders: {
          useDefault: false,
          overrides: processedEvent.reminders?.map(reminder => ({
            method: reminder.type === 'EMAIL' ? 'email' : 'popup',
            minutes: Math.floor(reminder.minutes || 0)
          }))
        }
      };

      return {
        success: true,
        data: googleEvent,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Transform internal CalendarEvent to Outlook Calendar format
   */
  static toOutlookCalendarEvent(
    event: CalendarEvent,
    privacySettings?: PrivacySettings
  ): TransformationResult<OutlookCalendarEvent> {
    try {
      const warnings: string[] = [];
      
      // Apply privacy filters
      if (privacySettings?.enabled) {
        const filterResult = this.applyPrivacyFilters(event, privacySettings);
        if (!filterResult.allowed) {
          return {
            success: false,
            error: 'Event filtered out by privacy settings'
          };
        }
        if (filterResult.warnings) {
          warnings.push(...filterResult.warnings);
        }
      }

      const processedEvent = privacySettings?.enabled 
        ? this.applyPrivacyTransformations(event, privacySettings)
        : event;

      const outlookEvent: OutlookCalendarEvent = {
        id: processedEvent.externalId || '',
        subject: processedEvent.title,
        body: {
          contentType: 'text',
          content: processedEvent.description || ''
        },
        location: processedEvent.location ? {
          displayName: processedEvent.location
        } : undefined,
        start: {
          dateTime: processedEvent.startTime?.toISOString() || new Date().toISOString(),
          timeZone: processedEvent.timezone || 'UTC'
        },
        end: {
          dateTime: processedEvent.endTime?.toISOString() || new Date().toISOString(),
          timeZone: processedEvent.timezone || 'UTC'
        },
        attendees: processedEvent.attendees?.map(email => ({
          emailAddress: { address: email, name: email },
          status: {
            response: 'none' as const,
            time: new Date().toISOString()
          }
        })),
        showAs: this.mapStatusToOutlook(processedEvent.status) as 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown' | undefined,
        recurrence: processedEvent.recurrenceRule ? {
          pattern: this.parseRecurrenceRule(processedEvent.recurrenceRule)
        } : undefined
      };

      return {
        success: true,
        data: outlookEvent,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Transform Google Calendar event to internal format
   */
  static fromGoogleCalendarEvent(
    googleEvent: GoogleCalendarEvent,
    userId: string,
    calendarId: string
  ): TransformationResult<CalendarEvent> {
    try {
      const event: CalendarEvent = {
        id: '', // Will be set by the database
        title: googleEvent.summary || 'Sem título',
        description: googleEvent.description,
        startDate: new Date(googleEvent.start.dateTime || googleEvent.start.date!),
        endDate: new Date(googleEvent.end.dateTime || googleEvent.end.date!),
        startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date!),
        endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date!),
        timezone: googleEvent.start.timeZone || 'UTC',
        location: googleEvent.location,
        attendees: googleEvent.attendees?.map(a => a.email).filter(Boolean) as string[],
        visibility: 'default', // Google Calendar API doesn't provide visibility
        status: this.mapStatusFromGoogle(googleEvent.status),
        type: googleEvent.start.date ? CalendarEventType.ALL_DAY : CalendarEventType.TIMED,
        userId,
        calendarId,
        externalId: googleEvent.id,
        recurrenceRule: googleEvent.recurrence?.[0],
        reminders: googleEvent.reminders?.overrides?.map(reminder => ({
          id: '',
          type: (reminder.method === 'email' ? 'EMAIL' : 'PUSH') as AppReminderType,
          minutes: reminder.minutes,
          method: reminder.method === 'email' ? 'email' : 'popup'
        }))
      };

      return {
        success: true,
        data: event
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Transform Outlook Calendar event to internal format
   */
  static fromOutlookCalendarEvent(
    outlookEvent: OutlookCalendarEvent,
    userId: string,
    calendarId: string
  ): TransformationResult<CalendarEvent> {
    try {
      const event: CalendarEvent = {
        id: '', // Will be set by the database
        title: outlookEvent.subject || 'Sem título',
        description: outlookEvent.body?.content,
        startDate: new Date(outlookEvent.start.dateTime),
        endDate: new Date(outlookEvent.end.dateTime),
        startTime: new Date(outlookEvent.start.dateTime),
        endTime: new Date(outlookEvent.end.dateTime),
        timezone: outlookEvent.start.timeZone || 'UTC',
        location: outlookEvent.location?.displayName,
        attendees: outlookEvent.attendees?.map(a => a.emailAddress.address).filter(Boolean) as string[],
        visibility: 'default', // Outlook API doesn't provide sensitivity in this format
        status: this.mapStatusFromOutlook(outlookEvent.showAs),
        type: CalendarEventType.TIMED, // Outlook doesn't have a clear all-day indicator in this format
        userId,
        calendarId,
        externalId: outlookEvent.id,
        recurrenceRule: outlookEvent.recurrence ? this.stringifyRecurrencePattern(outlookEvent.recurrence.pattern) : undefined
      };

      return {
        success: true,
        data: event
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Apply privacy filters to determine if event should be synced
   */
  private static applyPrivacyFilters(
    event: CalendarEvent,
    settings: PrivacySettings
  ): { allowed: boolean; warnings?: string[] } {
    const warnings: string[] = [];

    // Check visibility settings
    if (event.visibility === 'private' && !settings.syncPrivateEvents) {
      return { allowed: false };
    }
    if (event.visibility === 'confidential' && !settings.syncConfidentialEvents) {
      return { allowed: false };
    }

    // Check time range
    const now = new Date();
    const pastLimit = new Date(now.getTime() - settings.timeSettings.syncDuration.past * 24 * 60 * 60 * 1000);
    const futureLimit = new Date(now.getTime() + settings.timeSettings.syncDuration.future * 24 * 60 * 60 * 1000);
    
    if (event.startTime && (event.startTime < pastLimit || event.startTime > futureLimit)) {
      return { allowed: false };
    }

    // Check keyword filtering
    if (settings.keywordFiltering.enabled && settings.keywordFiltering.keywords.length > 0) {
      const eventText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase();
      const hasKeyword = settings.keywordFiltering.keywords.some(keyword => 
        eventText.includes(keyword.toLowerCase())
      );

      if (settings.keywordFiltering.mode === 'exclude' && hasKeyword) {
        return { allowed: false };
      }
      if (settings.keywordFiltering.mode === 'includeOnly' && !hasKeyword) {
        return { allowed: false };
      }
    }

    // Check advanced rules
    for (const rule of settings.advancedRules) {
      const fieldValue = this.getEventFieldValue(event, rule.field);
      if (this.matchesRule(fieldValue, rule.operator, rule.value)) {
        if (rule.action === 'exclude') {
          return { allowed: false };
        }
        if (rule.action === 'includeOnly') {
          // For includeOnly rules, we need at least one match
          // This is handled by checking if any includeOnly rule matches
        }
      }
    }

    // Check if there are includeOnly rules and none matched
    const includeOnlyRules = settings.advancedRules.filter(r => r.action === 'includeOnly');
    if (includeOnlyRules.length > 0) {
      const hasMatch = includeOnlyRules.some(rule => {
        const fieldValue = this.getEventFieldValue(event, rule.field);
        return this.matchesRule(fieldValue, rule.operator, rule.value);
      });
      if (!hasMatch) {
        return { allowed: false };
      }
    }

    return { allowed: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Apply privacy transformations to event data
   */
  private static applyPrivacyTransformations(
    event: CalendarEvent,
    settings: PrivacySettings
  ): CalendarEvent {
    const transformed = { ...event };

    // Apply field-level transformations
    if (!settings.fieldSettings.title.sync) {
      transformed.title = settings.fieldSettings.title.placeholder || 'Evento Privado';
    } else if (settings.fieldSettings.title.anonymize || 
               (settings.anonymizePrivateEvents && event.visibility === 'private')) {
      transformed.title = settings.fieldSettings.title.placeholder || 'Evento Privado';
    }

    if (!settings.fieldSettings.description.sync) {
      transformed.description = undefined;
    } else if (settings.fieldSettings.description.anonymize || 
               (settings.anonymizePrivateEvents && event.visibility === 'private')) {
      transformed.description = settings.fieldSettings.description.placeholder || undefined;
    }

    if (!settings.fieldSettings.location.sync) {
      transformed.location = undefined;
    } else if (settings.fieldSettings.location.anonymize || 
               (settings.anonymizePrivateEvents && event.visibility === 'private')) {
      transformed.location = settings.fieldSettings.location.placeholder || undefined;
    }

    if (!settings.fieldSettings.attendees.sync) {
      transformed.attendees = [];
    } else if (settings.fieldSettings.attendees.anonymize || 
               (settings.anonymizePrivateEvents && event.visibility === 'private')) {
      transformed.attendees = [];
    }

    // Apply advanced rule transformations
    for (const rule of settings.advancedRules) {
      if (rule.action === 'anonymize') {
        const fieldValue = this.getEventFieldValue(transformed, rule.field);
        if (this.matchesRule(fieldValue, rule.operator, rule.value)) {
          this.applyAnonymization(transformed, rule.field, settings);
        }
      }
    }

    // Round time to hour if enabled
    if (settings.timeSettings.roundToHour && transformed.startTime && transformed.endTime) {
      transformed.startTime = new Date(transformed.startTime);
      transformed.startTime.setMinutes(0, 0, 0);
      
      transformed.endTime = new Date(transformed.endTime);
      transformed.endTime.setMinutes(0, 0, 0);
      if (transformed.endTime <= transformed.startTime) {
        transformed.endTime.setHours(transformed.endTime.getHours() + 1);
      }
    }

    return transformed;
  }

  // Helper methods for mapping between different calendar formats
  private static mapVisibilityToGoogle(visibility: string): string {
    switch (visibility) {
      case 'private': return 'private';
      case 'confidential': return 'confidential';
      case 'public': return 'public';
      default: return 'default';
    }
  }

  private static mapVisibilityToOutlook(visibility: string): string {
    switch (visibility) {
      case 'private': return 'private';
      case 'confidential': return 'confidential';
      case 'public': return 'normal';
      default: return 'normal';
    }
  }

  private static mapVisibilityFromGoogle(visibility?: string): string {
    switch (visibility) {
      case 'private': return 'private';
      case 'confidential': return 'confidential';
      case 'public': return 'public';
      default: return 'default';
    }
  }

  private static mapVisibilityFromOutlook(sensitivity?: string): string {
    switch (sensitivity) {
      case 'private': return 'private';
      case 'confidential': return 'confidential';
      case 'normal': return 'public';
      default: return 'default';
    }
  }

  private static mapStatusToGoogle(status: EventStatus | CalendarEventStatus): string {
    switch (status) {
      case CalendarEventStatus.CONFIRMED: return 'confirmed';
      case CalendarEventStatus.TENTATIVE: return 'tentative';
      case CalendarEventStatus.CANCELLED: return 'cancelled';
      case EventStatus.PUBLISHED: return 'confirmed';
      case EventStatus.DRAFT: return 'tentative';
      case EventStatus.CANCELED: return 'cancelled';
      default: return 'confirmed';
    }
  }

  private static mapStatusToOutlook(status: EventStatus | CalendarEventStatus): 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown' {
    switch (status) {
      case CalendarEventStatus.CONFIRMED: return 'busy';
      case CalendarEventStatus.TENTATIVE: return 'tentative';
      case CalendarEventStatus.CANCELLED: return 'free';
      case EventStatus.PUBLISHED: return 'busy';
      case EventStatus.DRAFT: return 'tentative';
      case EventStatus.CANCELED: return 'free';
      default: return 'busy';
    }
  }

  private static mapStatusFromGoogle(status?: string): CalendarEventStatus {
    switch (status) {
      case 'confirmed': return CalendarEventStatus.CONFIRMED;
      case 'tentative': return CalendarEventStatus.TENTATIVE;
      case 'cancelled': return CalendarEventStatus.CANCELLED;
      default: return CalendarEventStatus.CONFIRMED;
    }
  }

  private static mapStatusFromOutlook(showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'): CalendarEventStatus {
    switch (showAs) {
      case 'busy': return CalendarEventStatus.CONFIRMED;
      case 'tentative': return CalendarEventStatus.TENTATIVE;
      case 'free': return CalendarEventStatus.CANCELLED;
      default: return CalendarEventStatus.CONFIRMED;
    }
  }

  private static getEventFieldValue(event: CalendarEvent, field: string): string {
    switch (field) {
      case 'title': return event.title || '';
      case 'description': return event.description || '';
      case 'location': return event.location || '';
      case 'attendees': return event.attendees?.join(', ') || '';
      case 'category': return '';
      default: return '';
    }
  }

  private static matchesRule(value: string, operator: string, ruleValue: string): boolean {
    const lowerValue = value.toLowerCase();
    const lowerRuleValue = ruleValue.toLowerCase();

    switch (operator) {
      case 'contains': return lowerValue.includes(lowerRuleValue);
      case 'equals': return lowerValue === lowerRuleValue;
      case 'startsWith': return lowerValue.startsWith(lowerRuleValue);
      case 'endsWith': return lowerValue.endsWith(lowerRuleValue);
      case 'regex': 
        try {
          return new RegExp(ruleValue, 'i').test(value);
        } catch {
          return false;
        }
      default: return false;
    }
  }

  private static applyAnonymization(event: CalendarEvent, field: string, settings: PrivacySettings): void {
    switch (field) {
      case 'title':
        event.title = settings.fieldSettings.title.placeholder || 'Evento Privado';
        break;
      case 'description':
        event.description = settings.fieldSettings.description.placeholder || undefined;
        break;
      case 'location':
        event.location = settings.fieldSettings.location.placeholder || undefined;
        break;
      case 'attendees':
        event.attendees = [];
        break;
    }
  }

  private static parseRecurrenceRule(rrule: string): any {
    // Basic RRULE parsing for Outlook format
    // This is a simplified implementation
    return {
      type: 'weekly',
      interval: 1
    };
  }

  private static stringifyRecurrencePattern(pattern: any): string {
    // Convert Outlook recurrence pattern to RRULE format
    // This is a simplified implementation
    return 'FREQ=WEEKLY;INTERVAL=1';
  }
}
