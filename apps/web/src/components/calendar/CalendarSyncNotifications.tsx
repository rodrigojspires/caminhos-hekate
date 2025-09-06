'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Mail,
  Smartphone,
  Settings,
  Trash2,
  CheckCheck,
  Filter,
} from 'lucide-react';

interface SyncNotification {
  id: string;
  integrationId: string;
  provider: 'GOOGLE' | 'OUTLOOK';
  type: 'SYNC_SUCCESS' | 'SYNC_FAILED' | 'CONFLICT_DETECTED' | 'AUTH_EXPIRED' | 'QUOTA_EXCEEDED' | 'CONNECTION_ERROR';
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  data?: {
    syncId?: string;
    conflictId?: string;
    eventsProcessed?: number;
    errorCode?: string;
    retryAfter?: string;
  };
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  notificationTypes: {
    syncSuccess: boolean;
    syncFailed: boolean;
    conflictDetected: boolean;
    authExpired: boolean;
    quotaExceeded: boolean;
    connectionError: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

interface CalendarSyncNotificationsProps {
  integrationId?: string;
}

export default function CalendarSyncNotifications({ integrationId }: CalendarSyncNotificationsProps) {
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    notificationTypes: {
      syncSuccess: false,
      syncFailed: true,
      conflictDetected: true,
      authExpired: true,
      quotaExceeded: true,
      connectionError: true,
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
    frequency: 'immediate',
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'error' | 'warning'>('all');
  const [hasChanges, setHasChanges] = useState(false);

  async function fetchNotifications() {
    try {
      const params = new URLSearchParams();
      if (integrationId) params.append('integrationId', integrationId);
      params.append('limit', '50');
      
      const response = await fetch(`/api/calendar/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const response = await fetch('/api/calendar/notification-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => data.settings || prev);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, [integrationId]);

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/calendar/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast.success('Configurações salvas');
        setHasChanges(false);
      } else {
        toast.error('Falha ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/calendar/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/calendar/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('Todas as notificações marcadas como lidas');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/calendar/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast.success('Notificação removida');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro ao remover notificação');
    }
  };

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateNotificationTypes = (type: keyof NotificationSettings['notificationTypes'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      notificationTypes: {
        ...prev.notificationTypes,
        [type]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'SYNC_SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'SYNC_FAILED':
      case 'CONNECTION_ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CONFLICT_DETECTED':
      case 'AUTH_EXPIRED':
      case 'QUOTA_EXCEEDED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      success: 'default',
      info: 'secondary',
      warning: 'outline',
      error: 'destructive',
    } as const;
    
    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'secondary'}>
        {severity === 'success' ? 'Sucesso' : 
         severity === 'info' ? 'Info' :
         severity === 'warning' ? 'Aviso' : 'Erro'}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      SYNC_SUCCESS: 'Sincronização Bem-sucedida',
      SYNC_FAILED: 'Falha na Sincronização',
      CONFLICT_DETECTED: 'Conflito Detectado',
      AUTH_EXPIRED: 'Autenticação Expirada',
      QUOTA_EXCEEDED: 'Cota Excedida',
      CONNECTION_ERROR: 'Erro de Conexão',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'success':
        return notification.severity === 'success';
      case 'error':
        return notification.severity === 'error';
      case 'warning':
        return notification.severity === 'warning';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Notificação
          </CardTitle>
          <CardDescription>
            Configure como e quando receber notificações sobre sincronizações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Canais de Notificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                />
                <Label>Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => updateSettings({ pushNotifications: checked })}
                />
                <Label>Push</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={settings.inAppNotifications}
                  onCheckedChange={(checked) => updateSettings({ inAppNotifications: checked })}
                />
                <Label>In-App</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Tipos de Notificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Sincronização Bem-sucedida</Label>
                <Switch
                  checked={settings.notificationTypes.syncSuccess}
                  onCheckedChange={(checked) => updateNotificationTypes('syncSuccess', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Falha na Sincronização</Label>
                <Switch
                  checked={settings.notificationTypes.syncFailed}
                  onCheckedChange={(checked) => updateNotificationTypes('syncFailed', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Conflito Detectado</Label>
                <Switch
                  checked={settings.notificationTypes.conflictDetected}
                  onCheckedChange={(checked) => updateNotificationTypes('conflictDetected', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Autenticação Expirada</Label>
                <Switch
                  checked={settings.notificationTypes.authExpired}
                  onCheckedChange={(checked) => updateNotificationTypes('authExpired', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cota Excedida</Label>
                <Switch
                  checked={settings.notificationTypes.quotaExceeded}
                  onCheckedChange={(checked) => updateNotificationTypes('quotaExceeded', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Erro de Conexão</Label>
                <Switch
                  checked={settings.notificationTypes.connectionError}
                  onCheckedChange={(checked) => updateNotificationTypes('connectionError', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Frequency and Quiet Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value: any) => updateSettings({ frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediato</SelectItem>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.quietHours.enabled}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      quietHours: { ...settings.quietHours, enabled: checked } 
                    })
                  }
                />
                <Label>Horário Silencioso</Label>
              </div>
              {settings.quietHours.enabled && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={settings.quietHours.startTime}
                    onChange={(e) => 
                      updateSettings({ 
                        quietHours: { ...settings.quietHours, startTime: e.target.value } 
                      })
                    }
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <input
                    type="time"
                    value={settings.quietHours.endTime}
                    onChange={(e) => 
                      updateSettings({ 
                        quietHours: { ...settings.quietHours, endTime: e.target.value } 
                      })
                    }
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={saveSettings}>
                Salvar Configurações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Histórico de notificações de sincronização
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Avisos</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4" />
                  Marcar Todas como Lidas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`${!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getNotificationIcon(notification.type, notification.severity)}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{notification.title}</p>
                              {getSeverityBadge(notification.severity)}
                              {!notification.isRead && (
                                <Badge variant="secondary" className="text-xs">Nova</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(notification.createdAt).toLocaleString('pt-BR')}
                              </span>
                              <span>{getTypeLabel(notification.type)}</span>
                              <span>
                                {notification.provider === 'GOOGLE' ? '🔗 Google' : '📧 Outlook'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {filter === 'all' 
                    ? 'Nenhuma notificação encontrada.'
                    : `Nenhuma notificação ${filter === 'unread' ? 'não lida' : `do tipo "${filter}"`} encontrada.`
                  }
                </AlertDescription>
              </Alert>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}