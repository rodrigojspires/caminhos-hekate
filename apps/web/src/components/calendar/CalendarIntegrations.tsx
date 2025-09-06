'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Calendar,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarIntegrationSettings } from './CalendarIntegrationSettings';
import { CalendarSyncDashboard } from './CalendarSyncDashboard';
import { CalendarIntegration, CalendarProvider } from '@/lib/services/enhancedCalendarIntegration';

const PROVIDERS: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📅',
    color: '#4285f4'
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    icon: '📆',
    color: '#0078d4'
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    color: '#007aff'
  }
];

interface CalendarIntegrationsProps {
  className?: string;
}

export function CalendarIntegrations({ className }: CalendarIntegrationsProps) {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<CalendarIntegration | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSyncDashboard, setShowSyncDashboard] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/integrations');
      const data = await response.json();
      
      if (data.success) {
        setIntegrations(data.data);
      } else {
        toast.error('Falha ao carregar integrações');
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: CalendarProvider['id']) => {
    try {
      const response = await fetch('/api/calendar/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to OAuth URL
        window.location.href = data.data.authUrl;
      } else {
        toast.error(data.error || 'Falha ao conectar calendário');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Erro ao conectar calendário');
    }
  };

  const handleToggleActive = async (integration: CalendarIntegration) => {
    try {
      const response = await fetch(`/api/calendar/integrations/${integration.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !integration.isActive })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIntegrations(prev => 
          prev.map(int => 
            int.id === integration.id 
              ? { ...int, isActive: !int.isActive }
              : int
          )
        );
        toast.success(
          integration.isActive 
            ? 'Integração desativada' 
            : 'Integração ativada'
        );
      } else {
        toast.error('Falha ao atualizar integração');
      }
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error('Erro ao atualizar integração');
    }
  };

  const handleSync = async (integration: CalendarIntegration) => {
    setSyncing(integration.id);
    
    try {
      const response = await fetch(`/api/calendar/integrations/${integration.id}/sync`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        const result = data.data;
        toast.success(
          `Sincronização concluída! Importados: ${result.imported}, Exportados: ${result.exported}${
            result.errors.length > 0 ? `, Erros: ${result.errors.length}` : ''
          }`
        );
        
        // Refresh integrations to update last sync time
        fetchIntegrations();
      } else {
        toast.error(data.error || 'Falha na sincronização');
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('Erro na sincronização');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (integration: CalendarIntegration) => {
    try {
      const response = await fetch(`/api/calendar/integrations/${integration.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIntegrations(prev => prev.filter(int => int.id !== integration.id));
        toast.success('Integração removida com sucesso');
      } else {
        toast.error('Falha ao remover integração');
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('Erro ao remover integração');
    }
  };

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId);
  };

  const getStatusIcon = (integration: CalendarIntegration) => {
    if (!integration.isActive) {
      return <XCircle className="h-4 w-4 text-gray-400" />;
    }
    
    if (integration.syncError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (integration: CalendarIntegration) => {
    if (!integration.isActive) return 'Inativo';
    if (integration.syncError) return 'Erro';
    return 'Ativo';
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando integrações...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrações de Calendário</h2>
          <p className="text-muted-foreground">
            Conecte seus calendários externos para sincronização automática de eventos.
          </p>
        </div>

        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Conectar Novo Calendário
            </CardTitle>
            <CardDescription>
              Escolha um provedor de calendário para conectar à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PROVIDERS.map((provider) => {
                const isConnected = integrations.some(int => int.provider === provider.id);
                const isApple = provider.id === 'apple';
                
                return (
                  <Card 
                    key={provider.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isConnected ? 'border-green-200 bg-green-50' : ''
                    } ${isApple ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{provider.icon}</span>
                          <div>
                            <h3 className="font-medium">{provider.name}</h3>
                            {isConnected && (
                              <Badge variant="secondary" className="text-xs">
                                Conectado
                              </Badge>
                            )}
                            {isApple && (
                              <Badge variant="outline" className="text-xs">
                                Em breve
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {!isConnected && !isApple && (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(provider.id)}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Conectar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendários Conectados
              </CardTitle>
              <CardDescription>
                Gerencie suas integrações de calendário ativas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration, index) => {
                  const provider = getProviderInfo(integration.provider);
                  
                  return (
                    <div key={integration.id}>
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{provider?.icon}</span>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{integration.calendarName}</h3>
                              {getStatusIcon(integration)}
                              <Badge variant="outline" className="text-xs">
                                {getStatusText(integration)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Última sync: {formatLastSync(integration.lastSyncAt || null)}
                              </span>
                              
                              {integration.syncError && (
                                <span className="text-red-500 text-xs">
                                  {integration.syncError}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.isActive}
                            onCheckedChange={() => handleToggleActive(integration)}
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(integration)}
                            disabled={!integration.isActive || syncing === integration.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${
                              syncing === integration.id ? 'animate-spin' : ''
                            }`} />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedIntegration(integration)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Configurações da Integração</DialogTitle>
                                <DialogDescription>
                                  Configure as opções de sincronização para {integration.calendarName}.
                                </DialogDescription>
                              </DialogHeader>
                              {selectedIntegration && (
                                <CalendarIntegrationSettings
                                  integration={selectedIntegration}
                                  onUpdate={fetchIntegrations}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedIntegration(integration)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Dashboard de Sincronização</DialogTitle>
                                <DialogDescription>
                                  Visualize o status e histórico de sincronização.
                                </DialogDescription>
                              </DialogHeader>
                              {selectedIntegration && (
                                <CalendarSyncDashboard
                                  integration={selectedIntegration}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Integração</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover a integração com {integration.calendarName}?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(integration)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {index < integrations.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default CalendarIntegrations;