'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Calendar,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface CalendarIntegration {
  id: string;
  provider: 'GOOGLE' | 'OUTLOOK';
  providerAccountId: string;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  settings: {
    syncDirection?: 'import' | 'export' | 'bidirectional';
    syncFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly';
    eventTypes?: string[];
    privacyLevel?: 'all' | 'public_only' | 'private_only';
    conflictResolution?: 'manual' | 'keep_local' | 'keep_external';
    calendarId?: string;
    calendarName?: string;
    timeZone?: string;
  };
  stats?: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    pendingConflicts: number;
    lastSyncStatus: 'SUCCESS' | 'FAILED' | null;
  };
}

interface CalendarIntegrationSettingsProps {
  integration?: any;
  onIntegrationChange?: () => void;
  onUpdate?: () => void;
}

function CalendarIntegrationSettings({ onIntegrationChange, onUpdate }: CalendarIntegrationSettingsProps) {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/integrations?includeStats=true');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
      } else {
        toast.error('Falha ao carregar integrações de calendário');
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const response = await fetch(`/api/calendar/auth/${provider}`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        
        // Listen for auth completion
        const checkAuth = setInterval(async () => {
          await fetchIntegrations();
          const hasNewIntegration = integrations.some(i => 
            i.provider === provider.toUpperCase() && i.isActive
          );
          if (hasNewIntegration) {
            clearInterval(checkAuth);
            toast.success(`${provider === 'google' ? 'Google Calendar' : 'Outlook'} conectado com sucesso!`);
            (onIntegrationChange ?? onUpdate)?.();
          }
        }, 2000);
        
        // Stop checking after 5 minutes
        setTimeout(() => clearInterval(checkAuth), 300000);
      } else {
        toast.error('Falha ao iniciar autenticação');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Erro ao conectar calendário');
    }
  };

  const updateIntegration = async (integrationId: string, updates: Partial<CalendarIntegration>) => {
    setUpdating(integrationId);
    try {
      const response = await fetch('/api/calendar/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, ...updates }),
      });

      if (response.ok) {
        await fetchIntegrations();
        toast.success('Configurações atualizadas');
        (onIntegrationChange ?? onUpdate)?.();
      } else {
        toast.error('Falha ao atualizar configurações');
      }
    } catch (error) {
      console.error('Error updating integration:', error);
      toast.error('Erro ao atualizar configurações');
    } finally {
      setUpdating(null);
    }
  };

  const triggerSync = async (integrationId: string) => {
    setSyncing(integrationId);
    try {
      const response = await fetch('/api/calendar/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_sync', integrationId }),
      });

      if (response.ok) {
        toast.success('Sincronização iniciada');
        await fetchIntegrations();
      } else {
        toast.error('Falha ao iniciar sincronização');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const deleteIntegration = async (integrationId: string, provider: string) => {
    if (!confirm(`Tem certeza que deseja remover a integração com ${provider}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/integrations?integrationId=${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchIntegrations();
        toast.success('Integração removida');
        (onIntegrationChange ?? onUpdate)?.();
      } else {
        toast.error('Falha ao remover integração');
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('Erro ao remover integração');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'GOOGLE':
        return '🔗';
      case 'OUTLOOK':
        return '📧';
      default:
        return '📅';
    }
  };

  const getStatusBadge = (integration: CalendarIntegration) => {
    if (!integration.isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (!integration.syncEnabled) {
      return <Badge variant="outline">Sync Desabilitado</Badge>;
    }
    if (integration.stats?.lastSyncStatus === 'FAILED') {
      return <Badge variant="destructive">Erro na Sync</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Integrações de Calendário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Integrações de Calendário
          </CardTitle>
          <CardDescription>
            Conecte seus calendários externos para sincronização automática de eventos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connect New Calendars */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Conectar Calendários</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => connectCalendar('google')}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🔗</span>
                <span>Google Calendar</span>
              </Button>
              <Button
                onClick={() => connectCalendar('outlook')}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📧</span>
                <span>Outlook Calendar</span>
              </Button>
            </div>
          </div>

          {integrations.length > 0 && (
            <>
              <Separator />
              
              {/* Existing Integrations */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendários Conectados</h3>
                
                {integrations.map((integration) => (
                  <Card key={integration.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
                          <div>
                            <CardTitle className="text-base">
                              {integration.provider === 'GOOGLE' ? 'Google Calendar' : 'Outlook Calendar'}
                            </CardTitle>
                            <CardDescription>
                              {integration.settings.calendarName || 'Calendário Principal'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(integration)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIntegration(integration.id, integration.provider)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Stats */}
                      {integration.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {integration.stats.totalSyncs}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Syncs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {integration.stats.successfulSyncs}
                            </div>
                            <div className="text-xs text-muted-foreground">Sucessos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {integration.stats.failedSyncs}
                            </div>
                            <div className="text-xs text-muted-foreground">Falhas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {integration.stats.pendingConflicts}
                            </div>
                            <div className="text-xs text-muted-foreground">Conflitos</div>
                          </div>
                        </div>
                      )}

                      {/* Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Status da Integração</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={integration.isActive}
                              onCheckedChange={(checked) => 
                                updateIntegration(integration.id, { isActive: checked })
                              }
                              disabled={updating === integration.id}
                            />
                            <span className="text-sm">
                              {integration.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Sincronização Automática</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={integration.syncEnabled}
                              onCheckedChange={(checked) => 
                                updateIntegration(integration.id, { syncEnabled: checked })
                              }
                              disabled={updating === integration.id || !integration.isActive}
                            />
                            <span className="text-sm">
                              {integration.syncEnabled ? 'Habilitado' : 'Desabilitado'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Direção da Sincronização</Label>
                          <Select
                            value={integration.settings.syncDirection || 'bidirectional'}
                            onValueChange={(value) => 
                              updateIntegration(integration.id, {
                                settings: { ...integration.settings, syncDirection: value as any }
                              })
                            }
                            disabled={updating === integration.id}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bidirectional">Bidirecional</SelectItem>
                              <SelectItem value="import">Apenas Importar</SelectItem>
                              <SelectItem value="export">Apenas Exportar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Resolução de Conflitos</Label>
                          <Select
                            value={integration.settings.conflictResolution || 'manual'}
                            onValueChange={(value) => 
                              updateIntegration(integration.id, {
                                settings: { ...integration.settings, conflictResolution: value as any }
                              })
                            }
                            disabled={updating === integration.id}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="keep_local">Manter Local</SelectItem>
                              <SelectItem value="keep_external">Manter Externo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          {integration.lastSyncAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Última sync: {new Date(integration.lastSyncAt).toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            'Nunca sincronizado'
                          )}
                        </div>
                        
                        <Button
                          onClick={() => triggerSync(integration.id)}
                          disabled={syncing === integration.id || !integration.isActive}
                          size="sm"
                        >
                          {syncing === integration.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Sincronizar Agora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {integrations.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum calendário conectado. Conecte seus calendários externos para começar a sincronizar eventos automaticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { CalendarIntegrationSettings };
export default CalendarIntegrationSettings;