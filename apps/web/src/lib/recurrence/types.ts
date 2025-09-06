export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type WeekDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export type MonthlyType = 'BY_DATE' | 'BY_DAY'; // Por data (dia 15) ou por dia (segunda segunda-feira)

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // A cada X unidades (ex: a cada 2 semanas)
  count?: number; // Número máximo de ocorrências
  until?: Date; // Data limite
  byWeekDay?: WeekDay[]; // Dias da semana (para WEEKLY e MONTHLY)
  byMonthDay?: number[]; // Dias do mês (1-31)
  byMonth?: number[]; // Meses (1-12)
  bySetPos?: number[]; // Posição no conjunto (ex: primeira segunda-feira = 1)
  weekStart?: WeekDay; // Primeiro dia da semana
  monthlyType?: MonthlyType; // Tipo de recorrência mensal
}

export interface RecurrenceException {
  id: string;
  originalDate: Date;
  type: 'MODIFIED' | 'DELETED';
  modifiedEvent?: Partial<CalendarEvent>;
  createdAt: Date;
}

export interface RecurrentEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  recurrenceRule: RecurrenceRule;
  exceptions: RecurrenceException[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventInstance {
  id: string;
  parentEventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isException: boolean;
  originalDate?: Date; // Data original se for exceção
  createdAt: Date;
}

export interface RecurringEventInstance {
  startDate: Date;
  endDate: Date;
  originalStartDate: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isRecurrent: boolean;
  recurrentEventId?: string;
  isInstance?: boolean;
  originalDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurrenceGenerationOptions {
  startDate: Date;
  endDate: Date;
  maxInstances?: number;
  includeExceptions?: boolean;
}

export interface RecurrencePattern {
  id: string;
  name: string;
  description: string;
  rule: RecurrenceRule;
  isCustom: boolean;
  createdBy?: string;
}

// Padrões pré-definidos comuns
export const COMMON_PATTERNS: RecurrencePattern[] = [
  {
    id: 'daily',
    name: 'Diariamente',
    description: 'Todos os dias',
    rule: { frequency: 'DAILY', interval: 1 },
    isCustom: false
  },
  {
    id: 'weekdays',
    name: 'Dias úteis',
    description: 'Segunda a sexta-feira',
    rule: { 
      frequency: 'WEEKLY', 
      interval: 1, 
      byWeekDay: ['MO', 'TU', 'WE', 'TH', 'FR'] 
    },
    isCustom: false
  },
  {
    id: 'weekly',
    name: 'Semanalmente',
    description: 'Toda semana no mesmo dia',
    rule: { frequency: 'WEEKLY', interval: 1 },
    isCustom: false
  },
  {
    id: 'biweekly',
    name: 'Quinzenalmente',
    description: 'A cada duas semanas',
    rule: { frequency: 'WEEKLY', interval: 2 },
    isCustom: false
  },
  {
    id: 'monthly',
    name: 'Mensalmente',
    description: 'Todo mês no mesmo dia',
    rule: { frequency: 'MONTHLY', interval: 1, monthlyType: 'BY_DATE' },
    isCustom: false
  },
  {
    id: 'monthly_weekday',
    name: 'Mensalmente (dia da semana)',
    description: 'Todo mês no mesmo dia da semana',
    rule: { frequency: 'MONTHLY', interval: 1, monthlyType: 'BY_DAY' },
    isCustom: false
  },
  {
    id: 'yearly',
    name: 'Anualmente',
    description: 'Todo ano na mesma data',
    rule: { frequency: 'YEARLY', interval: 1 },
    isCustom: false
  }
];