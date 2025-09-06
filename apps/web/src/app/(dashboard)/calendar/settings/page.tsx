'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CalendarIntegrationSettings from '@/components/calendar/CalendarIntegrationSettings';
import CalendarSyncDashboard from '@/components/calendar/CalendarSyncDashboard';
import CalendarFieldMapping from '@/components/calendar/CalendarFieldMapping';
import CalendarSyncNotifications from '@/components/calendar/CalendarSyncNotifications';
import CalendarPrivacySettings from '@/components/calendar/CalendarPrivacySettings';
import { Calendar, Settings, Shield, Bell, ArrowLeftRight } from 'lucide-react';

export default function CalendarSettingsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Calendário</h1>
          <p className="text-muted-foreground">
            Gerencie suas integrações de calendário e configurações de sincronização
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center space-x-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Mapeamento</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Privacidade</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard de Sincronização</CardTitle>
              <CardDescription>
                Visão geral das suas integrações de calendário e status de sincronização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarSyncDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações de Calendário</CardTitle>
              <CardDescription>
                Conecte e gerencie suas contas de calendário externo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarIntegrationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos</CardTitle>
              <CardDescription>
                Configure como os campos dos eventos são mapeados entre diferentes provedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarFieldMapping />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Privacidade</CardTitle>
              <CardDescription>
                Controle quais eventos e informações são sincronizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarPrivacySettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações de Sincronização</CardTitle>
              <CardDescription>
                Configure como e quando receber notificações sobre sincronização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarSyncNotifications />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}