'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface NotificationSettings {
  id?: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  syncSuccess: boolean;
  syncFailed: boolean;
  conflictDetected: boolean;
  integrationConnected: boolean;
  integrationDisconnected: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SyncNotification {
  id: string;
  integrationId: string;
  type: 'sync_success' | 'sync_failed' | 'conflict_detected' | 'integration_connected' | 'integration_disconnected';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  integration?: {
    provider: string;
    providerAccountId: string;
  };
}

const defaultSettings: Omit<NotificationSettings, 'userId'> = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  syncSuccess: false,
  syncFailed: true,
  conflictDetected: true,
  integrationConnected: true,
  integrationDisconnected: true,
  frequency: 'immediate',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
};

export function useCalendarNotifications() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'sync_success' | 'sync_failed' | 'conflict_detected' | 'integration_connected' | 'integration_disconnected',
    isRead: 'all' as 'all' | 'read' | 'unread',
    integrationId: 'all' as string
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/notifications/settings');
      
      if (!response.ok) throw new Error('Failed to fetch notification settings');
      
      const data = await response.json();
      setSettings(data.settings || { ...defaultSettings, userId: 'current' });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Erro ao carregar configurações de notificação');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.isRead !== 'all') params.append('isRead', filters.isRead === 'read' ? 'true' : 'false');
      if (filters.integrationId !== 'all') params.append('integrationId', filters.integrationId);

      const response = await fetch(`/api/calendar/notifications?${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações');
    }
  }, [filters]);

  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      setSaving(true);
      const response = await fetch('/api/calendar/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) throw new Error('Failed to save notification settings');
      
      const data = await response.json();
      setSettings(data.settings);
      toast.success('Configurações de notificação salvas com sucesso');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Erro ao salvar configurações de notificação');
    } finally {
      setSaving(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/calendar/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/calendar/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete notification');
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      toast.success('Notificação removida com sucesso');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro ao remover notificação');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      await Promise.all(
        unreadNotifications.map(notification => 
          fetch(`/api/calendar/notifications/${notification.id}/read`, {
            method: 'PATCH'
          })
        )
      );
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Erro ao marcar todas as notificações como lidas');
    }
  }, [notifications]);

  const deleteAllRead = useCallback(async () => {
    try {
      const readNotifications = notifications.filter(n => n.isRead);
      
      await Promise.all(
        readNotifications.map(notification => 
          fetch(`/api/calendar/notifications/${notification.id}`, {
            method: 'DELETE'
          })
        )
      );
      
      setNotifications(prev => prev.filter(notification => !notification.isRead));
      
      toast.success('Notificações lidas foram removidas');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Erro ao remover notificações lidas');
    }
  }, [notifications]);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    if (!settings) return;
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
  }, [settings]);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings({ ...defaultSettings, userId: 'current' });
    toast.info('Configurações restauradas para os padrões');
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    settings,
    notifications,
    loading,
    saving,
    filters,
    updateSettings,
    saveSettings,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    deleteAllRead,
    updateFilters,
    resetToDefaults,
    getUnreadCount,
    refresh: () => {
      fetchSettings();
      fetchNotifications();
    }
  };
}