export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  startTime?: Date
  endTime?: Date
  timezone?: string
  location?: string
  attendees?: string[]
  reminders?: CalendarReminder[]
  type: CalendarEventType
  status: CalendarEventStatus
  isAllDay?: boolean
  visibility?: 'public' | 'private' | 'confidential' | 'default'
  recurrence?: RecurrenceRule
  recurrenceRule?: string
  userId?: string
  calendarId?: string
  externalId?: string
  metadata?: Record<string, any>
}

export interface CalendarReminder {
  id: string
  type: ReminderType
  minutes: number
  method: 'email' | 'popup' | 'sms'
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  endDate?: Date
  count?: number
  byWeekDay?: number[]
  byMonthDay?: number[]
}

// Re-export Prisma enums
export { EventType, EventStatus, CalendarProvider, SyncStatus } from '@prisma/client'

// Sync direction enum
export enum SyncDirection {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  BIDIRECTIONAL = 'BIDIRECTIONAL'
}

// Additional calendar-specific enums
export enum CalendarEventType {
  ALL_DAY = 'ALL_DAY',
  TIMED = 'TIMED'
}

export enum CalendarEventStatus {
  CONFIRMED = 'CONFIRMED',
  TENTATIVE = 'TENTATIVE',
  CANCELLED = 'CANCELLED'
}

export enum ReminderType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export interface CalendarIntegrationConfig {
  provider: 'google' | 'outlook' | 'apple'
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  syncEnabled: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily'
}

export interface CalendarSyncResult {
  success: boolean
  eventsImported: number
  eventsExported: number
  conflicts: CalendarConflict[]
  errors: string[]
}

export interface CalendarConflict {
  id: string
  type: 'time_overlap' | 'duplicate' | 'data_mismatch'
  localEvent: CalendarEvent
  externalEvent: any
  resolution?: 'keep_local' | 'keep_external' | 'merge' | 'ignore'
}