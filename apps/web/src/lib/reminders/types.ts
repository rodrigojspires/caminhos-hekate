export type ReminderType = 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type TimingUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';

export interface ReminderTiming {
  value: number;
  unit: TimingUnit;
  description?: string;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  type: ReminderType;
  subject?: string; // Para email
  title?: string; // Para push/in-app
  message: string;
  variables: string[]; // Variáveis disponíveis no template
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderRule {
  id: string;
  eventId: string;
  type: ReminderType;
  timing: ReminderTiming;
  templateId?: string;
  customMessage?: string;
  isEnabled: boolean;
  conditions?: ReminderCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderCondition {
  type: 'WEATHER' | 'LOCATION' | 'TRAFFIC' | 'USER_STATUS' | 'EVENT_TYPE';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
  value: string | number | boolean;
  description?: string;
}

export interface ScheduledReminder {
  id: string;
  ruleId: string;
  eventId: string;
  eventInstanceId?: string; // Para eventos recorrentes
  userId: string;
  type: ReminderType;
  scheduledFor: Date;
  status: ReminderStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureReason?: string;
  content: ReminderContent;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderContent {
  subject?: string;
  title?: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface ReminderDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}

export interface ReminderPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string;
    timezone: string;
  };
  defaultTimings: ReminderTiming[];
  maxRemindersPerEvent: number;
  smartRemindersEnabled: boolean;
  locationBasedEnabled: boolean;
  weatherBasedEnabled: boolean;
  trafficBasedEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderStats {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  byType: Record<ReminderType, {
    scheduled: number;
    sent: number;
    failed: number;
    rate: number;
  }>;
  recentFailures: {
    reason: string;
    count: number;
    lastOccurrence: Date;
  }[];
}

export interface SmartReminderContext {
  userLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  weather?: {
    condition: string;
    temperature: number;
    precipitation: number;
  };
  traffic?: {
    estimatedTravelTime: number;
    normalTravelTime: number;
    congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  };
  userStatus?: {
    isActive: boolean;
    lastSeen: Date;
    currentActivity?: string;
  };
  deviceInfo?: {
    platform: string;
    pushToken?: string;
    timezone: string;
  };
}

export interface ReminderBatch {
  id: string;
  name: string;
  eventIds: string[];
  rules: Omit<ReminderRule, 'id' | 'eventId'>[];
  scheduledCount: number;
  processedCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  completedAt?: Date;
}

// Predefined timing options
export const COMMON_REMINDER_TIMINGS: ReminderTiming[] = [
  { value: 5, unit: 'MINUTES', description: '5 minutos antes' },
  { value: 15, unit: 'MINUTES', description: '15 minutos antes' },
  { value: 30, unit: 'MINUTES', description: '30 minutos antes' },
  { value: 1, unit: 'HOURS', description: '1 hora antes' },
  { value: 2, unit: 'HOURS', description: '2 horas antes' },
  { value: 1, unit: 'DAYS', description: '1 dia antes' },
  { value: 2, unit: 'DAYS', description: '2 dias antes' },
  { value: 1, unit: 'WEEKS', description: '1 semana antes' }
];

// Default templates
export const DEFAULT_REMINDER_TEMPLATES: Omit<ReminderTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Lembrete Simples - Email',
    type: 'EMAIL',
    subject: 'Lembrete: {{eventTitle}}',
    message: 'Olá {{userName}},\n\nEste é um lembrete sobre o evento "{{eventTitle}}" que acontecerá em {{timeUntilEvent}}.\n\nDetalhes:\n- Data: {{eventDate}}\n- Horário: {{eventTime}}\n- Local: {{eventLocation}}\n\nNão se esqueça!',
    variables: ['userName', 'eventTitle', 'timeUntilEvent', 'eventDate', 'eventTime', 'eventLocation'],
    isDefault: true
  },
  {
    name: 'Lembrete Simples - Push',
    type: 'PUSH',
    title: '{{eventTitle}}',
    message: 'Seu evento começa em {{timeUntilEvent}}',
    variables: ['eventTitle', 'timeUntilEvent'],
    isDefault: true
  },
  {
    name: 'Lembrete Simples - SMS',
    type: 'SMS',
    message: 'Lembrete: "{{eventTitle}}" em {{timeUntilEvent}}. Local: {{eventLocation}}',
    variables: ['eventTitle', 'timeUntilEvent', 'eventLocation'],
    isDefault: true
  },
  {
    name: 'Lembrete In-App',
    type: 'IN_APP',
    title: 'Evento Próximo',
    message: '{{eventTitle}} começa em {{timeUntilEvent}}',
    variables: ['eventTitle', 'timeUntilEvent'],
    isDefault: true
  }
];