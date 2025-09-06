'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Download, 
  ExternalLink, 
  Settings, 
  Check, 
  X,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarEvent } from '@/types/events';
import { CalendarIntegrationService } from '@/lib/services/calendarIntegrationService';

interface CalendarIntegrationsProps {
  event?: CalendarEvent;
  showSettings?: boolean;
  className?: string;
}

interface IntegrationStatus {
  google: boolean;
  outlook: boolean;
}

interface IntegrationSettings {
  autoSync: boolean;
  syncReminders: boolean;
  syncAttendees: boolean;
  defaultCalendar: 'google' | 'outlook' | 'none';
}

export function CalendarIntegrations({ 
  event, 
  showSettings = false, 
  className = '' 
}: CalendarIntegrationsProps) {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    google: false,
    outlook: false
  });
  
  const [settings, setSettings] = useState<IntegrationSettings>({
    autoSync: false,
    syncReminders: true,
    syncAttendees: true,
    defaultCalendar: 'none'
  });
  
  const [loading, setLoading] = useState<{
    google: boolean;
    outlook: boolean;
    export: boolean;
  }>({
    google: false,
    outlook: false,
    export: false
  });
  
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    checkIntegrationStatus();
    loadSettings();
  }, []);

  const checkIntegrationStatus = () => {
    setIntegrationStatus({
      google: CalendarIntegrationService.isGoogleSignedIn(),
      outlook: CalendarIntegrationService.isOutlookSignedIn()
    });
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('calendar-integration-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings: IntegrationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('calendar-integration-settings', JSON.stringify(newSettings));
    toast.success('Configurações salvas');
  };

  const handleGoogleSignIn = async () => {
    setLoading(prev => ({ ...prev, google: true }));
    try {
      const success = await CalendarIntegrationService.signInToGoogle();
      if (success) {
        setIntegrationStatus(prev => ({ ...prev, google: true }));
        toast.success('Conectado ao Google Calendar');
      }
    } catch (error) {
      toast.error('Falha ao conectar com Google Calendar');
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleGoogleSignOut = async () => {
    setLoading(prev => ({ ...prev, google: true }));
    try {
      await CalendarIntegrationService.signOutFromGoogle();
      setIntegrationStatus(prev => ({ ...prev, google: false }));
    } catch (error) {
      toast.error('Falha ao desconectar do Google Calendar');
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleOutlookSignIn = async () => {
    setLoading(prev => ({ ...prev, outlook: true }));
    try {
      const success = await CalendarIntegrationService.signInToOutlook();
      if (success) {
        setIntegrationStatus(prev => ({ ...prev, outlook: true }));
        toast.success('Conectado ao Outlook Calendar');
      }
    } catch (error) {
      toast.error('Falha ao conectar com Outlook Calendar');
    } finally {
      setLoading(prev => ({ ...prev, outlook: false }));
    }
  };

  const handleOutlookSignOut = async () => {
    setLoading(prev => ({ ...prev, outlook: true }));
    try {
      await CalendarIntegrationService.signOutFromOutlook();
      setIntegrationStatus(prev => ({ ...prev, outlook: false }));
    } catch (error) {
      toast.error('Falha ao desconectar do Outlook Calendar');
    } finally {
      setLoading(prev => ({ ...prev, outlook: false }));
    }
  };

  const handleAddToGoogleCalendar = async () => {
    if (!event) return;
    
    setLoading(prev => ({ ...prev, google: true }));
    try {
      const success = await CalendarIntegrationService.addToGoogleCalendar(event);
      if (!success && !integrationStatus.google) {
        // Try to sign in first
        const signedIn = await CalendarIntegrationService.signInToGoogle();
        if (signedIn) {
          setIntegrationStatus(prev => ({ ...prev, google: true }));
          await CalendarIntegrationService.addToGoogleCalendar(event);
        }
      }
    } catch (error) {
      toast.error('Falha ao adicionar evento ao Google Calendar');
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleAddToOutlookCalendar = async () => {
    if (!event) return;
    
    setLoading(prev => ({ ...prev, outlook: true }));
    try {
      const success = await CalendarIntegrationService.addToOutlookCalendar(event);
      if (!success && !integrationStatus.outlook) {
        // Try to sign in first
        const signedIn = await CalendarIntegrationService.signInToOutlook();
        if (signedIn) {
          setIntegrationStatus(prev => ({ ...prev, outlook: true }));
          await CalendarIntegrationService.addToOutlookCalendar(event);
        }
      }
    } catch (error) {
      toast.error('Falha ao adicionar evento ao Outlook Calendar');
    } finally {
      setLoading(prev => ({ ...prev, outlook: false }));
    }
  };

  const handleExportToICS = async () => {
    if (!event) return;
    
    setLoading(prev => ({ ...prev, export: true }));
    try {
      await CalendarIntegrationService.exportToICS(event);
    } catch (error) {
      toast.error('Falha ao exportar evento');
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  };

  const generateQuickLinks = () => {
    if (!event) return null;
    return CalendarIntegrationService.generateCalendarLinks(event);
  };

  const quickLinks = generateQuickLinks();

  if (!event && !showSettings) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Event Actions */}
      {event && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Adicionar ao Calendário
            </CardTitle>
            <CardDescription>
              Sincronize este evento com seus calendários externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    {integrationStatus.google ? 'Conectado' : 'Não conectado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integrationStatus.google && (
                  <Badge variant="secondary" className="text-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToGoogleCalendar}
                  disabled={loading.google}
                >
                  {loading.google ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Outlook Calendar */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Outlook Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    {integrationStatus.outlook ? 'Conectado' : 'Não conectado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integrationStatus.outlook && (
                  <Badge variant="secondary" className="text-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToOutlookCalendar}
                  disabled={loading.outlook}
                >
                  {loading.outlook ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Ações Rápidas</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToICS}
                  disabled={loading.export}
                >
                  {loading.export ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Baixar ICS
                </Button>
                
                {quickLinks && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(quickLinks.google, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Google
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(quickLinks.outlook, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Outlook
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Integração
            </CardTitle>
            <CardDescription>
              Gerencie suas conexões com calendários externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Status das Conexões</p>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Google Calendar</span>
                </div>
                <div className="flex items-center gap-2">
                  {integrationStatus.google ? (
                    <>
                      <Badge variant="secondary" className="text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoogleSignOut}
                        disabled={loading.google}
                      >
                        {loading.google ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-red-600">
                        <X className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoogleSignIn}
                        disabled={loading.google}
                      >
                        {loading.google ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Conectar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Outlook Calendar</span>
                </div>
                <div className="flex items-center gap-2">
                  {integrationStatus.outlook ? (
                    <>
                      <Badge variant="secondary" className="text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOutlookSignOut}
                        disabled={loading.outlook}
                      >
                        {loading.outlook ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-red-600">
                        <X className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOutlookSignIn}
                        disabled={loading.outlook}
                      >
                        {loading.outlook ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Conectar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações Avançadas
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurações de Sincronização</DialogTitle>
                  <DialogDescription>
                    Configure como os eventos são sincronizados com calendários externos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-sync">Sincronização Automática</Label>
                    <Switch
                      id="auto-sync"
                      checked={settings.autoSync}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, autoSync: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-reminders">Sincronizar Lembretes</Label>
                    <Switch
                      id="sync-reminders"
                      checked={settings.syncReminders}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, syncReminders: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-attendees">Sincronizar Participantes</Label>
                    <Switch
                      id="sync-attendees"
                      checked={settings.syncAttendees}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, syncAttendees: checked })
                      }
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CalendarIntegrations;