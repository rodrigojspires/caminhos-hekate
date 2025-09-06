import { FieldMappingRule } from '@/hooks/useCalendarFieldMapping';

export interface HekateEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay: boolean;
  attendees?: string[];
  recurrence?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'public' | 'private';
  externalId?: string;
  externalProvider?: 'google' | 'outlook';
  lastSyncAt?: Date;
}

export interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurrence?: string[];
  colorId?: string;
  visibility?: 'default' | 'public' | 'private';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  created?: string;
  updated?: string;
}

export interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay: boolean;
  location?: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status: {
      response: string;
      time?: string;
    };
  }>;
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
      month?: number;
      dayOfMonth?: number;
      daysOfWeek?: string[];
    };
    range: {
      type: string;
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  categories?: string[];
  importance?: 'low' | 'normal' | 'high';
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export class CalendarTransformer {
  private static applyTransformation(
    value: any,
    transformation?: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'truncate' | 'custom',
    customTransformation?: string
  ): any {
    if (!value || transformation === 'none') return value;
    
    if (typeof value !== 'string') return value;
    
    switch (transformation) {
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'capitalize':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case 'truncate':
        return value.length > 100 ? value.substring(0, 100) + '...' : value;
      case 'custom':
        if (customTransformation) {
          try {
            // Simple custom transformations
            return eval(`"${value}".${customTransformation}`);
          } catch {
            return value;
          }
        }
        return value;
      default:
        return value;
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  static hekateToGoogle(event: HekateEvent, mappings: FieldMappingRule[]): GoogleEvent {
    const googleEvent: Partial<GoogleEvent> = {};
    
    mappings.forEach(mapping => {
      const hekateValue = this.getNestedValue(event, mapping.hekateField);
      if (hekateValue !== undefined) {
        const transformedValue = this.applyTransformation(
          hekateValue,
          mapping.transformation,
          mapping.customTransformation
        );
        this.setNestedValue(googleEvent, mapping.externalField, transformedValue);
      } else if (mapping.defaultValue) {
        this.setNestedValue(googleEvent, mapping.externalField, mapping.defaultValue);
      }
    });

    // Handle special cases
    if (event.isAllDay) {
      googleEvent.start = {
        date: event.startTime.toISOString().split('T')[0],
        timeZone: 'UTC'
      };
      googleEvent.end = {
        date: event.endTime.toISOString().split('T')[0],
        timeZone: 'UTC'
      };
    } else {
      googleEvent.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC'
      };
      googleEvent.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC'
      };
    }

    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
      googleEvent.attendees = event.attendees.map(email => ({
        email,
        responseStatus: 'needsAction'
      }));
    }

    return googleEvent as GoogleEvent;
  }

  static googleToHekate(googleEvent: GoogleEvent, mappings: FieldMappingRule[]): HekateEvent {
    const hekateEvent: Partial<HekateEvent> = {
      externalId: googleEvent.id,
      externalProvider: 'google',
      lastSyncAt: new Date()
    };
    
    mappings.forEach(mapping => {
      const googleValue = this.getNestedValue(googleEvent, mapping.externalField);
      if (googleValue !== undefined) {
        const transformedValue = this.applyTransformation(
          googleValue,
          mapping.transformation,
          mapping.customTransformation
        );
        this.setNestedValue(hekateEvent, mapping.hekateField, transformedValue);
      } else if (mapping.defaultValue) {
        this.setNestedValue(hekateEvent, mapping.hekateField, mapping.defaultValue);
      }
    });

    // Handle special cases
    if (googleEvent.start.date) {
      hekateEvent.isAllDay = true;
      hekateEvent.startTime = new Date(googleEvent.start.date + 'T00:00:00Z');
      hekateEvent.endTime = new Date(googleEvent.end.date + 'T23:59:59Z');
    } else if (googleEvent.start.dateTime) {
      hekateEvent.isAllDay = false;
      hekateEvent.startTime = new Date(googleEvent.start.dateTime);
      hekateEvent.endTime = new Date(googleEvent.end.dateTime!);
    }

    // Handle attendees
    if (googleEvent.attendees && googleEvent.attendees.length > 0) {
      hekateEvent.attendees = googleEvent.attendees.map(attendee => attendee.email);
    }

    // Handle recurrence
    if (googleEvent.recurrence && googleEvent.recurrence.length > 0) {
      hekateEvent.recurrence = googleEvent.recurrence[0];
    }

    return hekateEvent as HekateEvent;
  }

  static hekateToOutlook(event: HekateEvent, mappings: FieldMappingRule[]): OutlookEvent {
    const outlookEvent: Partial<OutlookEvent> = {};
    
    mappings.forEach(mapping => {
      const hekateValue = this.getNestedValue(event, mapping.hekateField);
      if (hekateValue !== undefined) {
        const transformedValue = this.applyTransformation(
          hekateValue,
          mapping.transformation,
          mapping.customTransformation
        );
        this.setNestedValue(outlookEvent, mapping.externalField, transformedValue);
      } else if (mapping.defaultValue) {
        this.setNestedValue(outlookEvent, mapping.externalField, mapping.defaultValue);
      }
    });

    // Handle special cases
    outlookEvent.start = {
      dateTime: event.startTime.toISOString(),
      timeZone: 'UTC'
    };
    outlookEvent.end = {
      dateTime: event.endTime.toISOString(),
      timeZone: 'UTC'
    };
    outlookEvent.isAllDay = event.isAllDay;

    // Handle description
    if (event.description) {
      outlookEvent.body = {
        contentType: 'text',
        content: event.description
      };
    }

    // Handle location
    if (event.location) {
      outlookEvent.location = {
        displayName: event.location
      };
    }

    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
      outlookEvent.attendees = event.attendees.map(email => ({
        emailAddress: {
          address: email
        },
        status: {
          response: 'none'
        }
      }));
    }

    // Handle priority
    if (event.priority) {
      outlookEvent.importance = event.priority === 'high' ? 'high' : 
                               event.priority === 'low' ? 'low' : 'normal';
    }

    return outlookEvent as OutlookEvent;
  }

  static outlookToHekate(outlookEvent: OutlookEvent, mappings: FieldMappingRule[]): HekateEvent {
    const hekateEvent: Partial<HekateEvent> = {
      externalId: outlookEvent.id,
      externalProvider: 'outlook',
      lastSyncAt: new Date()
    };
    
    mappings.forEach(mapping => {
      const outlookValue = this.getNestedValue(outlookEvent, mapping.externalField);
      if (outlookValue !== undefined) {
        const transformedValue = this.applyTransformation(
          outlookValue,
          mapping.transformation,
          mapping.customTransformation
        );
        this.setNestedValue(hekateEvent, mapping.hekateField, transformedValue);
      } else if (mapping.defaultValue) {
        this.setNestedValue(hekateEvent, mapping.hekateField, mapping.defaultValue);
      }
    });

    // Handle special cases
    hekateEvent.startTime = new Date(outlookEvent.start.dateTime);
    hekateEvent.endTime = new Date(outlookEvent.end.dateTime);
    hekateEvent.isAllDay = outlookEvent.isAllDay;

    // Handle attendees
    if (outlookEvent.attendees && outlookEvent.attendees.length > 0) {
      hekateEvent.attendees = outlookEvent.attendees.map(
        attendee => attendee.emailAddress.address
      );
    }

    // Handle priority
    if (outlookEvent.importance) {
      hekateEvent.priority = outlookEvent.importance === 'high' ? 'high' : 
                            outlookEvent.importance === 'low' ? 'low' : 'medium';
    }

    // Handle categories
    if (outlookEvent.categories && outlookEvent.categories.length > 0) {
      hekateEvent.category = outlookEvent.categories[0];
    }

    return hekateEvent as HekateEvent;
  }

  static validateEvent(event: HekateEvent, mappings: FieldMappingRule[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredMappings = mappings.filter(m => m.isRequired);
    
    requiredMappings.forEach(mapping => {
      const value = this.getNestedValue(event, mapping.hekateField);
      if (value === undefined || value === null || value === '') {
        errors.push(`Campo obrigatório '${mapping.hekateField}' está vazio`);
      }
    });

    // Basic validation
    if (!event.title || event.title.trim() === '') {
      errors.push('Título do evento é obrigatório');
    }

    if (!event.startTime || !event.endTime) {
      errors.push('Data/hora de início e fim são obrigatórias');
    } else if (event.startTime >= event.endTime) {
      errors.push('Data/hora de início deve ser anterior à data/hora de fim');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}