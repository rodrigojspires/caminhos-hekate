'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookStatistics {
  total: number;
  successful: number;
  failed: number;
  retried: number;
  successRate: number;
}

interface FailedWebhook {
  id: string;
  provider: string;
  eventType: string;
  eventId: string;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface MonitorData {
  provider: string;
  timeframe: string;
  statistics: WebhookStatistics;
}

interface FailedWebhooksData {
  provider: string;
  limit: number;
  failedWebhooks: FailedWebhook[];
}

interface HealthStatus {
  healthy: boolean;
  details: {
    overall: boolean;
    mercadopago: boolean;
    asaas: boolean;
  };
  recentActivity: WebhookStatistics;
  timestamp: string;
}

export default function WebhookMonitor() {
  const [statistics, setStatistics] = useState<MonitorData | null>(null);
  const [failedWebhooks, setFailedWebhooks] = useState<FailedWebhooksData | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const provider = selectedProvider === 'all' ? '' : selectedProvider;
      const response = await fetch(
        `/api/webhooks/monitor?action=stats&provider=${provider}&hours=${selectedTimeframe}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, selectedTimeframe]);

  const fetchFailedWebhooks = useCallback(async () => {
    try {
      const provider = selectedProvider === 'all' ? '' : selectedProvider;
      const response = await fetch(
        `/api/webhooks/monitor?action=failed&provider=${provider}&limit=20`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch failed webhooks');
      }
      
      const data = await response.json();
      if (data.success) {
        setFailedWebhooks(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching failed webhooks:', error);
      toast.error('Erro ao carregar webhooks falhados');
    }
  }, [selectedProvider]);

  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/webhooks/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'health_check' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      
      const data = await response.json();
      if (data.success) {
        setHealthStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchStatistics(),
      fetchFailedWebhooks(),
      fetchHealthStatus()
    ]);
  }, [fetchStatistics, fetchFailedWebhooks, fetchHealthStatus]);

  useEffect(() => {
    refreshAll();
  }, [selectedProvider, selectedTimeframe, refreshAll]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(refreshAll, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshAll]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Saudável
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Problema
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitor de Webhooks</h1>
          <p className="text-muted-foreground">
            Monitore o status e performance dos webhooks de pagamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="w-4 h-4 mr-2" />
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Provider</label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="MERCADOPAGO">MercadoPago</SelectItem>
              <SelectItem value="ASAAS">Asaas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Período</label>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hora</SelectItem>
              <SelectItem value="6">6 horas</SelectItem>
              <SelectItem value="24">24 horas</SelectItem>
              <SelectItem value="72">3 dias</SelectItem>
              <SelectItem value="168">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Alert className={healthStatus.healthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Status Geral: {getStatusBadge(healthStatus.healthy)}</span>
              <span>MercadoPago: {getStatusBadge(healthStatus.details.mercadopago)}</span>
              <span>Asaas: {getStatusBadge(healthStatus.details.asaas)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Última verificação: {formatDate(healthStatus.timestamp)}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.statistics.total}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.timeframe}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.statistics.successful}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.statistics.successRate.toFixed(1)}% taxa de sucesso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.statistics.failed}
              </div>
              <p className="text-xs text-muted-foreground">
                {((statistics.statistics.failed / statistics.statistics.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tentativas</CardTitle>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.statistics.retried}
              </div>
              <p className="text-xs text-muted-foreground">
                Webhooks reprocessados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failed Webhooks */}
      {failedWebhooks && (
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Falhados</CardTitle>
            <CardDescription>
              Últimos webhooks que falharam no processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {failedWebhooks.failedWebhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>Nenhum webhook falhado encontrado!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {failedWebhooks.failedWebhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{webhook.provider}</Badge>
                          <span className="font-medium">{webhook.eventType}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Event ID: {webhook.eventId}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{formatDate(webhook.createdAt)}</p>
                      </div>
                    </div>
                    {webhook.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-800">
                          <strong>Erro:</strong> {webhook.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}