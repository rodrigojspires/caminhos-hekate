import { toast } from 'sonner';

export interface CalendarNotification {
  id: string;
  type: 'sync_success' | 'sync_error' | 'sync_warning' | 'conflict_detected' | 'integration_connected' | 'integration_disconnected';
  title: string;
  message: string;
  integrationId: string;
  integrationName: string;
  timestamp: Date;
  data?: any;
  read: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: {
    browser: boolean;
    email: boolean;
    push: boolean;
  };
  events: {
    syncSuccess: boolean;
    syncError: boolean;
    syncWarning: boolean;
    conflictDetected: boolean;
    integrationConnected: boolean;
    integrationDisconnected: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

class CalendarNotificationService {
  private notifications: CalendarNotification[] = [];
  private settings: NotificationSettings | null = null;
  private listeners: ((notifications: CalendarNotification[]) => void)[] = [];
  private eventSource: EventSource | null = null;

  constructor() {
    this.loadSettings();
    this.loadNotifications();
    this.setupEventSource();
  }

  // Settings Management
  async loadSettings(): Promise<NotificationSettings> {
    try {
      const saved = localStorage.getItem('calendar-notification-settings');
      if (saved) {
        this.settings = JSON.parse(saved);
      } else {
        this.settings = this.getDefaultSettings();
      }
      return this.settings || this.getDefaultSettings();
    } catch (error) {
      console.error('Error loading notification settings:', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      localStorage.setItem('calendar-notification-settings', JSON.stringify(settings));
      this.settings = settings;
      
      // Here you would typically make an API call to save settings
      // await fetch('/api/notifications/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }

  getSettings(): NotificationSettings {
    return this.settings || this.getDefaultSettings();
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      channels: {
        browser: true,
        email: false,
        push: false
      },
      events: {
        syncSuccess: false,
        syncError: true,
        syncWarning: true,
        conflictDetected: true,
        integrationConnected: true,
        integrationDisconnected: true
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  // Notification Management
  async loadNotifications(): Promise<CalendarNotification[]> {
    try {
      const saved = localStorage.getItem('calendar-notifications');
      if (saved) {
        this.notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
      return this.notifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      localStorage.setItem('calendar-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  getNotifications(): CalendarNotification[] {
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async clearNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
    this.notifyListeners();
  }

  async removeNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    await this.saveNotifications();
    this.notifyListeners();
  }

  // Event Source for Real-time Notifications
  private setupEventSource(): void {
    if (typeof window === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/calendar/notifications/stream');
      
      this.eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          this.handleIncomingNotification(notification);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.setupEventSource();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up EventSource:', error);
    }
  }

  private async handleIncomingNotification(data: any): Promise<void> {
    const notification: CalendarNotification = {
      id: data.id || Date.now().toString(),
      type: data.type,
      title: data.title,
      message: data.message,
      integrationId: data.integrationId,
      integrationName: data.integrationName,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data.data,
      read: false
    };

    await this.addNotification(notification);
  }

  // Notification Creation
  async addNotification(notification: CalendarNotification): Promise<void> {
    if (!this.shouldShowNotification(notification)) {
      return;
    }

    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveNotifications();
    this.notifyListeners();
    
    // Show notification based on enabled channels
    await this.showNotification(notification);
  }

  private shouldShowNotification(notification: CalendarNotification): boolean {
    const settings = this.getSettings();
    
    if (!settings.enabled) {
      return false;
    }

    // Check if this event type is enabled
    const eventKey = this.getEventKey(notification.type);
    if (eventKey && !settings.events[eventKey]) {
      return false;
    }

    // Check quiet hours
    if (settings.quietHours.enabled && this.isInQuietHours(settings.quietHours)) {
      return false;
    }

    return true;
  }

  private getEventKey(type: CalendarNotification['type']): keyof NotificationSettings['events'] | null {
    const mapping: Record<CalendarNotification['type'], keyof NotificationSettings['events']> = {
      sync_success: 'syncSuccess',
      sync_error: 'syncError',
      sync_warning: 'syncWarning',
      conflict_detected: 'conflictDetected',
      integration_connected: 'integrationConnected',
      integration_disconnected: 'integrationDisconnected'
    };
    
    return mapping[type] || null;
  }

  private isInQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async showNotification(notification: CalendarNotification): Promise<void> {
    const settings = this.getSettings();
    
    // Browser notification
    if (settings.channels.browser) {
      this.showBrowserNotification(notification);
    }
    
    // Toast notification (always show for immediate feedback)
    this.showToastNotification(notification);
    
    // Email notification (would be handled by backend)
    if (settings.channels.email) {
      this.sendEmailNotification(notification);
    }
    
    // Push notification (would be handled by service worker)
    if (settings.channels.push) {
      this.sendPushNotification(notification);
    }
  }

  private showBrowserNotification(notification: CalendarNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        data: notification
      });
      
      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };
      
      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  private showToastNotification(notification: CalendarNotification): void {
    const getToastVariant = (type: CalendarNotification['type']) => {
      switch (type) {
        case 'sync_success':
        case 'integration_connected':
          return 'default';
        case 'sync_error':
        case 'integration_disconnected':
          return 'destructive';
        case 'sync_warning':
        case 'conflict_detected':
          return 'warning';
        default:
          return 'default';
      }
    };

    const variant = getToastVariant(notification.type);
    
    if (variant === 'destructive') {
      toast.error(notification.title, {
        description: notification.message
      });
    } else {
      toast.success(notification.title, {
        description: notification.message
      });
    }
  }

  private async sendEmailNotification(notification: CalendarNotification): Promise<void> {
    try {
      // This would be implemented as an API call to send email
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          integrationName: notification.integrationName,
          timestamp: notification.timestamp
        })
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private async sendPushNotification(notification: CalendarNotification): Promise<void> {
    try {
      // This would be implemented using service worker
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          data: notification
        });
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Utility Methods for Creating Notifications
  async notifySyncSuccess(integrationId: string, integrationName: string, stats: any): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'sync_success',
      title: 'Sincronização Concluída',
      message: `${integrationName}: ${stats.processed} eventos processados com sucesso.`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      data: stats,
      read: false
    });
  }

  async notifySyncError(integrationId: string, integrationName: string, error: string): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'sync_error',
      title: 'Erro na Sincronização',
      message: `${integrationName}: ${error}`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      data: { error },
      read: false
    });
  }

  async notifySyncWarning(integrationId: string, integrationName: string, warning: string): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'sync_warning',
      title: 'Aviso de Sincronização',
      message: `${integrationName}: ${warning}`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      data: { warning },
      read: false
    });
  }

  async notifyConflictDetected(integrationId: string, integrationName: string, conflicts: any[]): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'conflict_detected',
      title: 'Conflitos Detectados',
      message: `${integrationName}: ${conflicts.length} conflito(s) encontrado(s) e precisam de resolução.`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      data: { conflicts },
      read: false
    });
  }

  async notifyIntegrationConnected(integrationId: string, integrationName: string): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'integration_connected',
      title: 'Integração Conectada',
      message: `${integrationName} foi conectado com sucesso.`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      read: false
    });
  }

  async notifyIntegrationDisconnected(integrationId: string, integrationName: string): Promise<void> {
    await this.addNotification({
      id: Date.now().toString(),
      type: 'integration_disconnected',
      title: 'Integração Desconectada',
      message: `${integrationName} foi desconectado.`,
      integrationId,
      integrationName,
      timestamp: new Date(),
      read: false
    });
  }

  // Listener Management
  subscribe(listener: (notifications: CalendarNotification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getNotifications());
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const calendarNotificationService = new CalendarNotificationService();
export default calendarNotificationService;