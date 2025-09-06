'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface PrivacySettings {
  id?: string;
  integrationId: string;
  syncPrivateEvents: boolean;
  syncAllDayEvents: boolean;
  syncRecurringEvents: boolean;
  syncEventTitle: boolean;
  syncEventDescription: boolean;
  syncEventLocation: boolean;
  syncEventAttendees: boolean;
  syncEventAttachments: boolean;
  anonymizeTitle: boolean;
  anonymizeDescription: boolean;
  anonymizeLocation: boolean;
  anonymizeAttendees: boolean;
  timeFilterEnabled: boolean;
  timeFilterStart?: string;
  timeFilterEnd?: string;
  keywordFilterEnabled: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  customRules: PrivacyRule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrivacyRule {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
  action: 'include' | 'exclude' | 'anonymize';
}

const defaultSettings: Omit<PrivacySettings, 'integrationId'> = {
  syncPrivateEvents: false,
  syncAllDayEvents: true,
  syncRecurringEvents: true,
  syncEventTitle: true,
  syncEventDescription: true,
  syncEventLocation: true,
  syncEventAttendees: false,
  syncEventAttachments: false,
  anonymizeTitle: false,
  anonymizeDescription: false,
  anonymizeLocation: false,
  anonymizeAttendees: true,
  timeFilterEnabled: false,
  keywordFilterEnabled: false,
  includeKeywords: [],
  excludeKeywords: [],
  customRules: []
};

export function useCalendarPrivacy(integrationId?: string) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!integrationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/privacy?integrationId=${integrationId}`);
      
      if (!response.ok) throw new Error('Failed to fetch privacy settings');
      
      const data = await response.json();
      setSettings(data.settings || { ...defaultSettings, integrationId });
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Erro ao carregar configurações de privacidade');
      // Set default settings on error
      setSettings({ ...defaultSettings, integrationId });
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  const saveSettings = useCallback(async (newSettings: PrivacySettings) => {
    if (!integrationId) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/calendar/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) throw new Error('Failed to save privacy settings');
      
      const data = await response.json();
      setSettings(data.settings);
      toast.success('Configurações de privacidade salvas com sucesso');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Erro ao salvar configurações de privacidade');
    } finally {
      setSaving(false);
    }
  }, [integrationId]);

  const updateSettings = useCallback((updates: Partial<PrivacySettings>) => {
    if (!settings) return;
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
  }, [settings]);

  const addCustomRule = useCallback((rule: Omit<PrivacyRule, 'id'>) => {
    if (!settings) return;
    
    const newRule: PrivacyRule = {
      ...rule,
      id: Date.now().toString()
    };
    
    const newSettings = {
      ...settings,
      customRules: [...settings.customRules, newRule]
    };
    
    setSettings(newSettings);
  }, [settings]);

  const updateCustomRule = useCallback((ruleId: string, updates: Partial<PrivacyRule>) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      customRules: settings.customRules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    };
    
    setSettings(newSettings);
  }, [settings]);

  const removeCustomRule = useCallback((ruleId: string) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      customRules: settings.customRules.filter(rule => rule.id !== ruleId)
    };
    
    setSettings(newSettings);
  }, [settings]);

  const addKeyword = useCallback((keyword: string, type: 'include' | 'exclude') => {
    if (!settings || !keyword.trim()) return;
    
    const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
    const currentKeywords = settings[field];
    
    if (currentKeywords.includes(keyword.trim())) return;
    
    const newSettings = {
      ...settings,
      [field]: [...currentKeywords, keyword.trim()]
    };
    
    setSettings(newSettings);
  }, [settings]);

  const removeKeyword = useCallback((keyword: string, type: 'include' | 'exclude') => {
    if (!settings) return;
    
    const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
    const newSettings = {
      ...settings,
      [field]: settings[field].filter(k => k !== keyword)
    };
    
    setSettings(newSettings);
  }, [settings]);

  const resetToDefaults = useCallback(() => {
    if (!integrationId) return;
    
    setSettings({ ...defaultSettings, integrationId });
    toast.info('Configurações restauradas para os padrões');
  }, [integrationId]);

  useEffect(() => {
    if (integrationId) {
      fetchSettings();
    }
  }, [integrationId, fetchSettings]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
    saveSettings,
    addCustomRule,
    updateCustomRule,
    removeCustomRule,
    addKeyword,
    removeKeyword,
    resetToDefaults,
    refresh: fetchSettings
  };
}