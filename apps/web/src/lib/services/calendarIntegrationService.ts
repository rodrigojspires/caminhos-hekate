import { CalendarEvent } from '@/types/events';
import { toast } from 'sonner';

// Add global window type for gapi
declare global {
  interface Window {
    gapi?: any;
  }
}

// Google Calendar API types
interface GoogleCalendarEvent {
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
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  conferenceData?: {
    conferenceSolution?: {
      key: {
        type: string;
      };
    };
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
  recurrence?: string[];
}

// Outlook Calendar API types
interface OutlookCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
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
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  onlineMeeting?: {
    joinUrl: string;
  };
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
      interval: number;
      daysOfWeek?: string[];
    };
    range: {
      type: 'noEnd' | 'endDate' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
}

// ICS (iCalendar) format utilities
class ICSGenerator {
  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private static escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  static generateICS(event: CalendarEvent): string {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const now = new Date();

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Caminhos de Hekate//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@caminhosdehecate.com`,
      `DTSTAMP:${this.formatDate(now)}`,
      `DTSTART:${this.formatDate(startDate)}`,
      `DTEND:${this.formatDate(endDate)}`,
      `SUMMARY:${this.escapeText(event.title)}`,
    ];

    if (event.description) {
      icsContent.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    if (event.location) {
      icsContent.push(`LOCATION:${this.escapeText(event.location)}`);
    }

    if (event.virtualLink) {
      icsContent.push(`URL:${event.virtualLink}`);
    }

    // Add categories based on event type
    icsContent.push(`CATEGORIES:${event.type}`);

    icsContent.push(
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    );

    return icsContent.join('\r\n');
  }

  static downloadICS(event: CalendarEvent): void {
    const icsContent = this.generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    toast.success('Evento exportado para calendário');
  }
}

// Google Calendar Integration
class GoogleCalendarIntegration {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private static readonly API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  private static readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private static readonly SCOPES = 'https://www.googleapis.com/auth/calendar';

  private static gapi: any = null;
  private static isInitialized = false;

  static async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      // Load Google API script
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      await window.gapi!.load('client:auth2', async () => {
        await window.gapi!.client.init({
          apiKey: this.API_KEY,
          clientId: this.CLIENT_ID,
          discoveryDocs: [this.DISCOVERY_DOC],
          scope: this.SCOPES
        });
      });

      this.gapi = window.gapi;
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      return false;
    }
  }

  private static loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  static async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      return user.isSignedIn();
    } catch (error) {
      console.error('Google Calendar sign-in failed:', error);
      toast.error('Falha ao conectar com Google Calendar');
      return false;
    }
  }

  static async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      toast.success('Desconectado do Google Calendar');
    } catch (error) {
      console.error('Google Calendar sign-out failed:', error);
    }
  }

  static isSignedIn(): boolean {
    if (!this.isInitialized) return false;
    const authInstance = this.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  }

  private static convertToGoogleEvent(event: CalendarEvent): GoogleCalendarEvent {
    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: new Date(event.start).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(event.end).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    if (event.location) {
      googleEvent.location = event.location;
    }

    if (event.virtualLink) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `${event.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      };
    }

    return googleEvent;
  }

  static async createEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.isSignedIn()) {
      const signedIn = await this.signIn();
      if (!signedIn) return false;
    }

    try {
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent,
        conferenceDataVersion: 1
      });

      if (response.status === 200) {
        toast.success('Evento adicionado ao Google Calendar');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      toast.error('Falha ao adicionar evento ao Google Calendar');
      return false;
    }
  }

  static async updateEvent(eventId: string, event: CalendarEvent): Promise<boolean> {
    if (!this.isSignedIn()) return false;

    try {
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: googleEvent
      });

      if (response.status === 200) {
        toast.success('Evento atualizado no Google Calendar');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      toast.error('Falha ao atualizar evento no Google Calendar');
      return false;
    }
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isSignedIn()) return false;

    try {
      const response = await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      if (response.status === 204) {
        toast.success('Evento removido do Google Calendar');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
      toast.error('Falha ao remover evento do Google Calendar');
      return false;
    }
  }
}

// Outlook Calendar Integration
class OutlookCalendarIntegration {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
  private static readonly SCOPES = ['https://graph.microsoft.com/calendars.readwrite'];
  private static readonly GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

  private static accessToken: string | null = null;

  static async signIn(): Promise<boolean> {
    try {
      if (!this.CLIENT_ID) {
        toast.error('Outlook Client ID não configurado');
        return false;
      }

      // Implementação real usando Microsoft Graph API
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', this.CLIENT_ID);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('redirect_uri', window.location.origin + '/auth/outlook/callback');
      authUrl.searchParams.set('scope', this.SCOPES.join(' '));
      authUrl.searchParams.set('response_mode', 'fragment');
      authUrl.searchParams.set('state', Math.random().toString(36).substring(7));

      // Abrir popup para autenticação
      const popup = window.open(
        authUrl.toString(),
        'outlook-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            resolve(false);
          }
        }, 1000);

        // Listener para receber o token do popup
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
            this.accessToken = event.data.accessToken;
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            toast.success('Conectado ao Outlook Calendar');
            resolve(true);
          } else if (event.data.type === 'OUTLOOK_AUTH_ERROR') {
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            toast.error('Falha ao conectar com Outlook Calendar');
            resolve(false);
          }
        };

        window.addEventListener('message', messageListener);
      });
    } catch (error) {
      console.error('Outlook Calendar sign-in failed:', error);
      toast.error('Falha ao conectar com Outlook Calendar');
      return false;
    }
  }

  static async signOut(): Promise<void> {
    this.accessToken = null;
    toast.success('Desconectado do Outlook Calendar');
  }

  static isSignedIn(): boolean {
    return this.accessToken !== null;
  }

  private static convertToOutlookEvent(event: CalendarEvent): OutlookCalendarEvent {
    return {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: new Date(event.start).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(event.end).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location ? {
        displayName: event.location
      } : undefined,
      onlineMeeting: event.virtualLink ? {
        joinUrl: event.virtualLink
      } : undefined
    };
  }

  static async createEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.isSignedIn()) {
      const signedIn = await this.signIn();
      if (!signedIn) return false;
    }

    try {
      const outlookEvent = this.convertToOutlookEvent(event);
      
      const response = await fetch(`${this.GRAPH_ENDPOINT}/me/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outlookEvent)
      });

      if (response.ok) {
        toast.success('Evento adicionado ao Outlook Calendar');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create Outlook Calendar event:', error);
      toast.error('Falha ao adicionar evento ao Outlook Calendar');
      return false;
    }
  }
}

// Main Calendar Integration Service
export class CalendarIntegrationService {
  static async exportToICS(event: CalendarEvent): Promise<void> {
    ICSGenerator.downloadICS(event);
  }

  static async addToGoogleCalendar(event: CalendarEvent): Promise<boolean> {
    return await GoogleCalendarIntegration.createEvent(event);
  }

  static async addToOutlookCalendar(event: CalendarEvent): Promise<boolean> {
    return await OutlookCalendarIntegration.createEvent(event);
  }

  static async updateGoogleCalendarEvent(eventId: string, event: CalendarEvent): Promise<boolean> {
    return await GoogleCalendarIntegration.updateEvent(eventId, event);
  }

  static async deleteGoogleCalendarEvent(eventId: string): Promise<boolean> {
    return await GoogleCalendarIntegration.deleteEvent(eventId);
  }

  static async signInToGoogle(): Promise<boolean> {
    return await GoogleCalendarIntegration.signIn();
  }

  static async signOutFromGoogle(): Promise<void> {
    await GoogleCalendarIntegration.signOut();
  }

  static isGoogleSignedIn(): boolean {
    return GoogleCalendarIntegration.isSignedIn();
  }

  static async signInToOutlook(): Promise<boolean> {
    return await OutlookCalendarIntegration.signIn();
  }

  static async signOutFromOutlook(): Promise<void> {
    await OutlookCalendarIntegration.signOut();
  }

  static isOutlookSignedIn(): boolean {
    return OutlookCalendarIntegration.isSignedIn();
  }

  // Generate calendar links for quick access
  static generateCalendarLinks(event: CalendarEvent) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    const formatDateForUrl = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', event.title);
    googleUrl.searchParams.set('dates', `${formatDateForUrl(startDate)}/${formatDateForUrl(endDate)}`);
    if (event.description) googleUrl.searchParams.set('details', event.description);
    if (event.location) googleUrl.searchParams.set('location', event.location);

    const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    outlookUrl.searchParams.set('subject', event.title);
    outlookUrl.searchParams.set('startdt', startDate.toISOString());
    outlookUrl.searchParams.set('enddt', endDate.toISOString());
    if (event.description) outlookUrl.searchParams.set('body', event.description);
    if (event.location) outlookUrl.searchParams.set('location', event.location);

    return {
      google: googleUrl.toString(),
      outlook: outlookUrl.toString(),
      ics: () => this.exportToICS(event)
    };
  }
}

export default CalendarIntegrationService;