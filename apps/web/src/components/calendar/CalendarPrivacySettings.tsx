'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Plus,
  X,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface PrivacyRule {
  id: string;
  name: string;
  condition: {
    field: 'title' | 'description' | 'location' | 'category' | 'attendees' | 'duration' | 'isPrivate';
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
    value: string | number | boolean;
  };
  action: 'exclude' | 'anonymize' | 'include';
  enabled: boolean;
}

interface PrivacySettings {
  syncPrivateEvents: boolean;
  syncAllDayEvents: boolean;
  syncRecurringEvents: boolean;
  syncEventDetails: {
    title: boolean;
    description: boolean;
    location: boolean;
    attendees: boolean;
    attachments: boolean;
  };
  anonymization: {
    enabled: boolean;
    titleReplacement: string;
    descriptionReplacement: string;
    locationReplacement: string;
  };
  timeFilters: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    excludeWeekends: boolean;
  };
  categoryFilters: {
    enabled: boolean;
    includedCategories: string[];
    excludedCategories: string[];
  };
  keywordFilters: {
    enabled: boolean;
    excludeKeywords: string[];
    includeKeywords: string[];
  };
  rules: PrivacyRule[];
}

interface CalendarPrivacySettingsProps {
  integrationId?: string;
}

export default function CalendarPrivacySettings({ integrationId }: CalendarPrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    syncPrivateEvents: false,
    syncAllDayEvents: true,
    syncRecurringEvents: true,
    syncEventDetails: {
      title: true,
      description: true,
      location: true,
      attendees: false,
      attachments: false,
    },
    anonymization: {
      enabled: false,
      titleReplacement: 'Evento Privado',
      descriptionReplacement: '',
      locationReplacement: '',
    },
    timeFilters: {
      enabled: false,
      startTime: '09:00',
      endTime: '18:00',
      excludeWeekends: false,
    },
    categoryFilters: {
      enabled: false,
      includedCategories: [],
      excludedCategories: [],
    },
    keywordFilters: {
      enabled: false,
      excludeKeywords: [],
      includeKeywords: [],
    },
    rules: [],
  });
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PrivacyRule>>({
    name: '',
    condition: {
      field: 'title',
      operator: 'contains',
      value: '',
    },
    action: 'exclude',
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (integrationId) params.append('integrationId', integrationId);
        
        const response = await fetch(`/api/calendar/privacy-settings?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setSettings(prev => data.settings || prev);
          }
        }
      } catch (error) {
        console.error('Error fetching privacy settings:', error);
        toast.error('Erro ao carregar configurações de privacidade');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [integrationId]);

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/calendar/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings,
          integrationId 
        }),
      });

      if (response.ok) {
        toast.success('Configurações de privacidade salvas');
        setHasChanges(false);
      } else {
        toast.error('Falha ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const updateSettings = (updates: Partial<PrivacySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateSyncEventDetails = (field: keyof PrivacySettings['syncEventDetails'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      syncEventDetails: {
        ...prev.syncEventDetails,
        [field]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const updateAnonymization = (updates: Partial<PrivacySettings['anonymization']>) => {
    setSettings(prev => ({
      ...prev,
      anonymization: {
        ...prev.anonymization,
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  const updateTimeFilters = (updates: Partial<PrivacySettings['timeFilters']>) => {
    setSettings(prev => ({
      ...prev,
      timeFilters: {
        ...prev.timeFilters,
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  const updateCategoryFilters = (updates: Partial<PrivacySettings['categoryFilters']>) => {
    setSettings(prev => ({
      ...prev,
      categoryFilters: {
        ...prev.categoryFilters,
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  const updateKeywordFilters = (updates: Partial<PrivacySettings['keywordFilters']>) => {
    setSettings(prev => ({
      ...prev,
      keywordFilters: {
        ...prev.keywordFilters,
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  const addKeyword = (type: 'exclude' | 'include') => {
    if (!newKeyword.trim()) return;
    
    const field = type === 'exclude' ? 'excludeKeywords' : 'includeKeywords';
    const currentKeywords = settings.keywordFilters[field];
    
    if (!currentKeywords.includes(newKeyword.trim())) {
      updateKeywordFilters({
        [field]: [...currentKeywords, newKeyword.trim()],
      });
    }
    
    setNewKeyword('');
  };

  const removeKeyword = (type: 'exclude' | 'include', keyword: string) => {
    const field = type === 'exclude' ? 'excludeKeywords' : 'includeKeywords';
    const currentKeywords = settings.keywordFilters[field];
    
    updateKeywordFilters({
      [field]: currentKeywords.filter(k => k !== keyword),
    });
  };

  const addCategory = (type: 'include' | 'exclude') => {
    if (!newCategory.trim()) return;
    
    const field = type === 'include' ? 'includedCategories' : 'excludedCategories';
    const currentCategories = settings.categoryFilters[field];
    
    if (!currentCategories.includes(newCategory.trim())) {
      updateCategoryFilters({
        [field]: [...currentCategories, newCategory.trim()],
      });
    }
    
    setNewCategory('');
  };

  const removeCategory = (type: 'include' | 'exclude', category: string) => {
    const field = type === 'include' ? 'includedCategories' : 'excludedCategories';
    const currentCategories = settings.categoryFilters[field];
    
    updateCategoryFilters({
      [field]: currentCategories.filter(c => c !== category),
    });
  };

  const addRule = () => {
    if (!newRule.name || !newRule.condition?.value) {
      toast.error('Nome e condição são obrigatórios');
      return;
    }

    const rule: PrivacyRule = {
      id: Date.now().toString(),
      name: newRule.name!,
      condition: newRule.condition!,
      action: newRule.action!,
      enabled: newRule.enabled!,
    };

    updateSettings({
      rules: [...settings.rules, rule],
    });

    setNewRule({
      name: '',
      condition: {
        field: 'title',
        operator: 'contains',
        value: '',
      },
      action: 'exclude',
      enabled: true,
    });
    setShowRuleForm(false);
  };

  const removeRule = (ruleId: string) => {
    updateSettings({
      rules: settings.rules.filter(r => r.id !== ruleId),
    });
  };

  const toggleRule = (ruleId: string) => {
    updateSettings({
      rules: settings.rules.map(r => 
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    });
  };

  const getFieldLabel = (field: string) => {
    const labels = {
      title: 'Título',
      description: 'Descrição',
      location: 'Local',
      category: 'Categoria',
      attendees: 'Participantes',
      duration: 'Duração',
      isPrivate: 'É Privado',
    };
    return labels[field as keyof typeof labels] || field;
  };

  const getOperatorLabel = (operator: string) => {
    const labels = {
      contains: 'contém',
      equals: 'é igual a',
      startsWith: 'começa com',
      endsWith: 'termina com',
      greaterThan: 'maior que',
      lessThan: 'menor que',
      exists: 'existe',
      notExists: 'não existe',
    };
    return labels[operator as keyof typeof labels] || operator;
  };

  const getActionLabel = (action: string) => {
    const labels = {
      exclude: 'Excluir',
      anonymize: 'Anonimizar',
      include: 'Incluir',
    };
    return labels[action as keyof typeof labels] || action;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações de Privacidade
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
      {/* Basic Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações Básicas de Privacidade
          </CardTitle>
          <CardDescription>
            Controle quais tipos de eventos são sincronizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Eventos Privados
              </Label>
              <Switch
                checked={settings.syncPrivateEvents}
                onCheckedChange={(checked) => updateSettings({ syncPrivateEvents: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Eventos de Dia Inteiro
              </Label>
              <Switch
                checked={settings.syncAllDayEvents}
                onCheckedChange={(checked) => updateSettings({ syncAllDayEvents: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Eventos Recorrentes
              </Label>
              <Switch
                checked={settings.syncRecurringEvents}
                onCheckedChange={(checked) => updateSettings({ syncRecurringEvents: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Evento</CardTitle>
          <CardDescription>
            Escolha quais informações dos eventos sincronizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Título</Label>
              <Switch
                checked={settings.syncEventDetails.title}
                onCheckedChange={(checked) => updateSyncEventDetails('title', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Descrição</Label>
              <Switch
                checked={settings.syncEventDetails.description}
                onCheckedChange={(checked) => updateSyncEventDetails('description', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Local</Label>
              <Switch
                checked={settings.syncEventDetails.location}
                onCheckedChange={(checked) => updateSyncEventDetails('location', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Participantes</Label>
              <Switch
                checked={settings.syncEventDetails.attendees}
                onCheckedChange={(checked) => updateSyncEventDetails('attendees', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Anexos</Label>
              <Switch
                checked={settings.syncEventDetails.attachments}
                onCheckedChange={(checked) => updateSyncEventDetails('attachments', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anonymization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            Anonimização
          </CardTitle>
          <CardDescription>
            Configure como anonimizar informações sensíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar Anonimização</Label>
            <Switch
              checked={settings.anonymization.enabled}
              onCheckedChange={(checked) => updateAnonymization({ enabled: checked })}
            />
          </div>
          
          {settings.anonymization.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Substituição do Título</Label>
                <Input
                  value={settings.anonymization.titleReplacement}
                  onChange={(e) => updateAnonymization({ titleReplacement: e.target.value })}
                  placeholder="Evento Privado"
                />
              </div>
              <div className="space-y-2">
                <Label>Substituição da Descrição</Label>
                <Input
                  value={settings.anonymization.descriptionReplacement}
                  onChange={(e) => updateAnonymization({ descriptionReplacement: e.target.value })}
                  placeholder="Deixar vazio para remover"
                />
              </div>
              <div className="space-y-2">
                <Label>Substituição do Local</Label>
                <Input
                  value={settings.anonymization.locationReplacement}
                  onChange={(e) => updateAnonymization({ locationReplacement: e.target.value })}
                  placeholder="Deixar vazio para remover"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Filtros de Horário
          </CardTitle>
          <CardDescription>
            Sincronize apenas eventos em horários específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar Filtros de Horário</Label>
            <Switch
              checked={settings.timeFilters.enabled}
              onCheckedChange={(checked) => updateTimeFilters({ enabled: checked })}
            />
          </div>
          
          {settings.timeFilters.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário de Início</Label>
                  <Input
                    type="time"
                    value={settings.timeFilters.startTime}
                    onChange={(e) => updateTimeFilters({ startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Fim</Label>
                  <Input
                    type="time"
                    value={settings.timeFilters.endTime}
                    onChange={(e) => updateTimeFilters({ endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Excluir Fins de Semana</Label>
                <Switch
                  checked={settings.timeFilters.excludeWeekends}
                  onCheckedChange={(checked) => updateTimeFilters({ excludeWeekends: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyword Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Filtros por Palavra-chave
          </CardTitle>
          <CardDescription>
            Inclua ou exclua eventos baseado em palavras-chave
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar Filtros por Palavra-chave</Label>
            <Switch
              checked={settings.keywordFilters.enabled}
              onCheckedChange={(checked) => updateKeywordFilters({ enabled: checked })}
            />
          </div>
          
          {settings.keywordFilters.enabled && (
            <div className="space-y-6 pl-4 border-l-2 border-muted">
              {/* Exclude Keywords */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Palavras-chave para Excluir</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Digite uma palavra-chave"
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword('exclude')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addKeyword('exclude')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.keywordFilters.excludeKeywords.map((keyword) => (
                    <Badge key={keyword} variant="destructive" className="flex items-center gap-1">
                      {keyword}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeKeyword('exclude', keyword)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Include Keywords */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Palavras-chave para Incluir</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Digite uma palavra-chave"
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword('include')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addKeyword('include')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.keywordFilters.includeKeywords.map((keyword) => (
                    <Badge key={keyword} variant="default" className="flex items-center gap-1">
                      {keyword}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeKeyword('include', keyword)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Regras de Privacidade Avançadas
              </CardTitle>
              <CardDescription>
                Crie regras personalizadas para controlar a sincronização
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRuleForm(!showRuleForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showRuleForm && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Excluir reuniões pessoais"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Campo</Label>
                    <Select
                      value={newRule.condition?.field}
                      onValueChange={(value: any) => 
                        setNewRule(prev => ({
                          ...prev,
                          condition: { ...prev.condition!, field: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Título</SelectItem>
                        <SelectItem value="description">Descrição</SelectItem>
                        <SelectItem value="location">Local</SelectItem>
                        <SelectItem value="category">Categoria</SelectItem>
                        <SelectItem value="attendees">Participantes</SelectItem>
                        <SelectItem value="duration">Duração</SelectItem>
                        <SelectItem value="isPrivate">É Privado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select
                      value={newRule.condition?.operator}
                      onValueChange={(value: any) => 
                        setNewRule(prev => ({
                          ...prev,
                          condition: { ...prev.condition!, operator: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">contém</SelectItem>
                        <SelectItem value="equals">é igual a</SelectItem>
                        <SelectItem value="startsWith">começa com</SelectItem>
                        <SelectItem value="endsWith">termina com</SelectItem>
                        <SelectItem value="exists">existe</SelectItem>
                        <SelectItem value="notExists">não existe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={newRule.condition?.value?.toString() || ''}
                      onChange={(e) => 
                        setNewRule(prev => ({
                          ...prev,
                          condition: { ...prev.condition!, value: e.target.value }
                        }))
                      }
                      placeholder="Valor da condição"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Ação</Label>
                  <Select
                    value={newRule.action}
                    onValueChange={(value: any) => setNewRule(prev => ({ ...prev, action: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclude">Excluir</SelectItem>
                      <SelectItem value="anonymize">Anonimizar</SelectItem>
                      <SelectItem value="include">Incluir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRuleForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={addRule}>
                    Adicionar Regra
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {settings.rules.length > 0 ? (
            <div className="space-y-3">
              {settings.rules.map((rule) => (
                <Card key={rule.id} className={!rule.enabled ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.action === 'exclude' ? 'destructive' : 
                                        rule.action === 'anonymize' ? 'secondary' : 'default'}>
                            {getActionLabel(rule.action)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Se <strong>{getFieldLabel(rule.condition.field)}</strong> {' '}
                          <strong>{getOperatorLabel(rule.condition.operator)}</strong> {' '}
                          <strong>&quot;{rule.condition.value}&quot;</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(rule.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
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
                Nenhuma regra de privacidade configurada. Clique em &quot;Nova Regra&quot; para criar uma.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Alert className="flex-1 mr-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você tem alterações não salvas nas configurações de privacidade.
                </AlertDescription>
              </Alert>
              <Button onClick={saveSettings}>
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}