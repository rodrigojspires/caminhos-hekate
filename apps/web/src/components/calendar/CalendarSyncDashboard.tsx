'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  AlertCircle,
  Info,
} from 'lucide-react';

interface SyncEvent {
  id: string;
  integrationId: string;
  provider: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  direction: 'import' | 'export' | 'bidirectional';
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsSkipped: number;
  conflictsFound: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

interface CalendarConflict {
  id: string;
  eventId: string;
  integrationId: string;
  provider: string;
  conflictType: 'TIME_OVERLAP' | 'DUPLICATE_EVENT' | 'FIELD_MISMATCH' | 'PERMISSION_DENIED';
  localEvent: {
    title: string;
    startTime: string;
    endTime: string;
  };
  externalEvent: {
    title: string;
    startTime: string;
    endTime: string;
  };
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: 'KEEP_LOCAL' | 'KEEP_EXTERNAL' | 'MERGE' | 'IGNORE';
}

interface DashboardStats {
  totalIntegrations: number;
  activeIntegrations: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingConflicts: number;
  eventsImported: number;
  eventsExported: number;
  lastSyncAt?: string;
  syncSuccessRate: number;
}

interface CalendarSyncDashboardProps {
  onSettingsClick?: () => void;
  integration?: any;
}

function CalendarSyncDashboard({ onSettingsClick }: CalendarSyncDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSyncs, setRecentSyncs] = useState<SyncEvent[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setRefreshing(true);
      
      // Fetch integrations with stats
      const integrationsResponse = await fetch('/api/calendar/integrations?includeStats=true');
      if (integrationsResponse.ok) {
        const integrationsData = await integrationsResponse.json();
        calculateStats(integrationsData.integrations);
      }

      // Fetch recent sync events
      const syncsResponse = await fetch('/api/calendar/sync/recent?limit=10');
      if (syncsResponse.ok) {
        const syncsData = await (syncsResponse).json();
        setRecentSyncs(syncsData.syncEvents || []);
      }

      // Fetch pending conflicts
      const conflictsResponse = await fetch('/api/calendar/conflicts?status=PENDING&limit=20');
      if (conflictsResponse.ok) {
        const conflictsData = await conflictsResponse.json();
        setConflicts(conflictsData.conflicts || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const calculateStats = (integrations: any[]) => {
    const totalIntegrations = integrations.length;
    const activeIntegrations = integrations.filter(i => i.isActive && i.syncEnabled).length;
    
    let totalSyncs = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let pendingConflicts = 0;
    let eventsImported = 0;
    let eventsExported = 0;
    let lastSyncAt: string | undefined;

    integrations.forEach(integration => {
      if (integration.stats) {
        totalSyncs += integration.stats.totalSyncs || 0;
        successfulSyncs += integration.stats.successfulSyncs || 0;
        failedSyncs += integration.stats.failedSyncs || 0;
        pendingConflicts += integration.stats.pendingConflicts || 0;
        
        if (integration.lastSyncAt) {
          if (!lastSyncAt || new Date(integration.lastSyncAt) > new Date(lastSyncAt)) {
            lastSyncAt = integration.lastSyncAt;
          }
        }
      }
    });

    const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

    setStats({
      totalIntegrations,
      activeIntegrations,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      pendingConflicts,
      eventsImported,
      eventsExported,
      lastSyncAt,
      syncSuccessRate,
    });
  };

  const resolveConflict = async (conflictId: string, resolution: string) => {
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, resolution }),
      });

      if (response.ok) {
        toast.success('Conflito resolvido');
        await fetchDashboardData();
      } else {
        toast.error('Falha ao resolver conflito');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Erro ao resolver conflito');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'IN_PROGRESS':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'TIME_OVERLAP':
        return 'Sobreposição de Horário';
      case 'DUPLICATE_EVENT':
        return 'Evento Duplicado';
      case 'FIELD_MISMATCH':
        return 'Incompatibilidade de Campos';
      case 'PERMISSION_DENIED':
        return 'Permissão Negada';
      default:
        return type;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dashboard de Sincronização
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Dashboard de Sincronização
              </CardTitle>
              <CardDescription>
                Monitore e gerencie suas integrações de calendário
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={refreshing}
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
              {onSettingsClick && (
                <Button variant="outline" size="sm" onClick={onSettingsClick}>
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Integrações Ativas</p>
                  <p className="text-2xl font-bold">
                    {stats.activeIntegrations}/{stats.totalIntegrations}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold">{stats.syncSuccessRate.toFixed(1)}%</p>
                  <Progress value={stats.syncSuccessRate} className="mt-2" />
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conflitos Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingConflicts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Syncs</p>
                  <p className="text-2xl font-bold">{stats.totalSyncs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.successfulSyncs} sucessos, {stats.failedSyncs} falhas
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="syncs">Sincronizações Recentes</TabsTrigger>
          <TabsTrigger value="conflicts">Conflitos ({conflicts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumo de Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.lastSyncAt ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Última Sincronização</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stats.lastSyncAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.successfulSyncs}
                      </div>
                      <div className="text-sm text-muted-foreground">Syncs Bem-sucedidas</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.failedSyncs}
                      </div>
                      <div className="text-sm text-muted-foreground">Syncs com Falha</div>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma sincronização realizada ainda. Configure suas integrações para começar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="syncs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sincronizações Recentes</CardTitle>
              <CardDescription>
                Histórico das últimas sincronizações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentSyncs.length > 0 ? (
                  <div className="space-y-4">
                    {recentSyncs.map((sync) => (
                      <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(sync.status)}
                          <div>
                            <p className="font-medium">
                              {sync.provider === 'GOOGLE' ? 'Google Calendar' : 'Outlook Calendar'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sync.eventsProcessed} eventos processados
                              {sync.duration && ` • ${formatDuration(sync.duration)}`}
                            </p>
                            {sync.errorMessage && (
                              <p className="text-sm text-red-600 mt-1">{sync.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(sync.startedAt).toLocaleString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={sync.status === 'SUCCESS' ? 'default' : 'destructive'} className="text-xs">
                              {sync.status === 'SUCCESS' ? 'Sucesso' : sync.status === 'FAILED' ? 'Falha' : 'Em Progresso'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma sincronização encontrada.
                    </AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflitos de Sincronização
              </CardTitle>
              <CardDescription>
                Resolva conflitos entre eventos locais e externos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {conflicts.length > 0 ? (
                  <div className="space-y-4">
                    {conflicts.map((conflict) => (
                      <Card key={conflict.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {getConflictTypeLabel(conflict.conflictType)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {conflict.provider === 'GOOGLE' ? 'Google Calendar' : 'Outlook Calendar'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-blue-600">Evento Local</p>
                                <p className="font-medium">{conflict.localEvent.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(conflict.localEvent.startTime).toLocaleString('pt-BR')} - 
                                  {new Date(conflict.localEvent.endTime).toLocaleString('pt-BR')}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-green-600">Evento Externo</p>
                                <p className="font-medium">{conflict.externalEvent.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(conflict.externalEvent.startTime).toLocaleString('pt-BR')} - 
                                  {new Date(conflict.externalEvent.endTime).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveConflict(conflict.id, 'KEEP_LOCAL')}
                              >
                                Manter Local
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveConflict(conflict.id, 'KEEP_EXTERNAL')}
                              >
                                Manter Externo
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveConflict(conflict.id, 'IGNORE')}
                              >
                                Ignorar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum conflito pendente. Todas as sincronizações estão funcionando corretamente.
                    </AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { CalendarSyncDashboard };
export default CalendarSyncDashboard;