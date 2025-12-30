// ============================================================================
// EVENTS AND CALENDAR TYPES
// ============================================================================

export interface Event {
  id: string
  title: string
  description?: string
  type: EventType
  status: EventStatus
  startDate: Date
  endDate: Date
  timezone: string
  location?: string
  virtualLink?: string
  recordingLink?: string
  maxAttendees?: number
  isPublic: boolean
  requiresApproval: boolean
  tags: string[]
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  canceledAt?: Date
  creator: {
    id: string
    name: string
    email: string
    image?: string
  }
  registrations?: EventRegistration[]
  reminders?: EventReminder[]
  recurringEvents?: RecurringEvent[]
  _count?: {
    registrations: number
    attendees: number
  }
}

export interface EventRegistration {
  id: string
  eventId: string
  userId?: string
  guestEmail?: string
  guestName?: string
  status: EventRegistrationStatus
  attendedAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  event?: Event
  user?: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface EventReminder {
  id: string
  eventId: string
  userId?: string
  guestEmail?: string
  type: ReminderType
  triggerTime: Date
  sentAt?: Date
  status: ReminderStatus
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  event?: Event
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface RecurringEvent {
  id: string
  parentEventId: string
  recurrenceRule: RecurrenceRule
  exceptions: Date[]
  endDate?: Date
  maxOccurrences?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  parentEvent?: Event
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval?: number
  byweekday?: number[]
  bymonthday?: number[]
  bymonth?: number[]
  count?: number
  until?: Date
}

// ============================================================================
// ENUMS
// ============================================================================

export enum EventType {
  WEBINAR = 'WEBINAR',
  WORKSHOP = 'WORKSHOP',
  COURSE = 'COURSE',
  MEETING = 'MEETING',
  COMMUNITY = 'COMMUNITY',
  CONFERENCE = 'CONFERENCE',
  NETWORKING = 'NETWORKING',
  TRAINING = 'TRAINING'
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED'
}

export enum EventRegistrationStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELED = 'CANCELED',
  WAITLISTED = 'WAITLISTED'
}

export enum ReminderType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED'
}

// ============================================================================
// API TYPES
// ============================================================================

export interface CreateEventRequest {
  title: string
  description?: string
  type: EventType
  startDate: string
  endDate: string
  timezone?: string
  location?: string
  virtualLink?: string
  recordingLink?: string
  maxAttendees?: number
  isPublic?: boolean
  requiresApproval?: boolean
  tags?: string[]
  metadata?: Record<string, any>
  recurrence?: RecurrenceRule
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: EventStatus
  recurrenceInstanceId?: string
}

export interface EventRegistrationRequest {
  guestEmail?: string
  guestName?: string
  metadata?: Record<string, any>
}

export interface EventFilters {
  type?: EventType[]
  status?: EventStatus[]
  startDate?: string
  endDate?: string
  tags?: string[]
  createdBy?: string
  isPublic?: boolean
  search?: string
}

export interface EventsResponse {
  events: Event[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  textColor?: string
  backgroundColor?: string
  borderColor?: string
  url?: string
  classNames?: string[]
  display?: 'auto' | 'block' | 'list-item' | 'background' | 'inverse-background' | 'none'
  overlap?: boolean
  constraint?: string
  editable?: boolean
  startEditable?: boolean
  durationEditable?: boolean
  resourceEditable?: boolean
  extendedProps?: {
    event: Event
    type: EventType
    status: EventStatus
    registrationCount: number
    maxAttendees?: number
  }
}

export interface CalendarView {
  name: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'
  title: string
}

// ============================================================================
// EXTERNAL CALENDAR INTEGRATION TYPES
// ============================================================================

export interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface OutlookCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface ICSExportOptions {
  includeDescription?: boolean
  includeLocation?: boolean
  includeAttendees?: boolean
  timezone?: string
}

export interface ExternalCalendarEvent {
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
  attendees?: {
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }[]
  recurrence?: string[]
  reminders?: {
    useDefault?: boolean
    overrides?: {
      method: 'email' | 'popup'
      minutes: number
    }[]
  }
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface EventNotification {
  id: string
  type: 'EVENT_CREATED' | 'EVENT_UPDATED' | 'EVENT_CANCELED' | 'EVENT_REMINDER' | 'REGISTRATION_CONFIRMED' | 'REGISTRATION_CANCELED'
  eventId: string
  userId?: string
  guestEmail?: string
  title: string
  message: string
  data?: Record<string, any>
  scheduledFor?: Date
  sentAt?: Date
  status: 'PENDING' | 'SENT' | 'FAILED'
  createdAt: Date
}

export interface ReminderSchedule {
  eventId: string
  reminders: {
    type: ReminderType
    minutesBefore: number
    template?: string
  }[]
}
