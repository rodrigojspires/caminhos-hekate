// Event types for the web application

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
  maxAttendees?: number
  isPublic: boolean
  requiresApproval: boolean
  tags: string[]
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  attendeeCount?: number
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
  type: EventType
  status: EventStatus
  location?: string
  virtualLink?: string
  description?: string
  attendeeCount: number
  maxAttendees?: number
  // UI convenience fields (optional)
  tags?: string[]
  creator?: {
    id: string
    name?: string
    email?: string
    image?: string
  }
  canRegister?: boolean
  userRegistration?: {
    status: string
  }
}

export interface EventRegistration {
  id: string
  eventId: string
  userId?: string
  guestEmail?: string
  guestName?: string
  status: EventRegistrationStatus
  registeredAt: Date
  metadata?: Record<string, any>
}

export interface EventReminder {
  id: string
  eventId: string
  userId?: string
  guestEmail?: string
  type: ReminderType
  status: ReminderStatus
  scheduledFor: Date
  sentAt?: Date
  message?: string
  metadata?: Record<string, any>
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

export interface RecurringEvent {
  id: string
  parentEventId: string
  recurrenceRule: RecurrenceRule
  exceptions: Date[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateEventRequest {
  title: string
  description?: string
  type: EventType
  startDate: string
  endDate: string
  timezone?: string
  location?: string
  virtualLink?: string
  maxAttendees?: number
  isPublic?: boolean
  requiresApproval?: boolean
  tags?: string[]
  metadata?: Record<string, any>
  recurrence?: RecurrenceRule
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: EventStatus
}

export interface EventRegistrationRequest {
  guestEmail?: string
  guestName?: string
  metadata?: Record<string, any>
}

export interface EventFilters {
  // Backend-compatible filters
  type?: EventType[]
  status?: EventStatus[]
  startDate?: string
  endDate?: string
  tags?: string[]
  createdBy?: string
  isPublic?: boolean
  search?: string
  
  // UI-facing filters used in components (e.g., CalendarFilters)
  types?: EventType[]
  timeFilter?: 'upcoming' | 'today' | 'this_week' | 'this_month' | 'past'
  participationFilter?: 'all' | 'my_events' | 'registered' | 'created'
  creatorId?: string
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