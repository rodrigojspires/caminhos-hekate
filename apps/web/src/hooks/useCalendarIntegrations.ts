'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook';
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  autoSync: boolean;
  syncDirection: 'import' | 'export' | 'bidirectional';
  conflictResolution: 'manual' | 'local_wins' | 'remote_wins' | 'newest_wins';
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    pendingConflicts: number;
  };
}

export interface SyncEvent {
  id: string;
  integrationId: string;
  type: 'import' | 'export';
  status: 'pending' | 'success' | 'failed';
  eventCount: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface SyncConflict {
  id: string;
  integrationId: string;
  eventId: string;
  conflictType: 'update' | 'delete' | 'create';
  localData: any;
  remoteData: any;
  status: 'pending' | 'resolved';
  resolution?: 'local' | 'remote' | 'merge';
  createdAt: Date;
}

export function useCalendarIntegrations() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/integrations?includeStats=true');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Erro ao carregar integrações');
    }
  }, []);

  const fetchSyncEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/sync/events?limit=10');
      if (!response.ok) throw new Error('Failed to fetch sync events');
      const data = await response.json();
      setSyncEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching sync events:', error);
    }
  }, []);

  const fetchConflicts = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/conflicts?status=pending');
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    }
  }, []);

  const updateIntegration = useCallback(async (
    integrationId: string,
    updates: Partial<Pick<CalendarIntegration, 'isActive' | 'autoSync' | 'syncDirection' | 'conflictResolution'>>
  ) => {
    try {
      const response = await fetch('/api/calendar/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, ...updates })
      });

      if (!response.ok) throw new Error('Failed to update integration');
      
      await fetchIntegrations();
      toast.success('Integração atualizada com sucesso');
    } catch (error) {
      console.error('Error updating integration:', error);
      toast.error('Erro ao atualizar integração');
    }
  }, [fetchIntegrations]);

  const deleteIntegration = useCallback(async (integrationId: string) => {
    try {
      const response = await fetch('/api/calendar/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      });

      if (!response.ok) throw new Error('Failed to delete integration');
      
      await fetchIntegrations();
      toast.success('Integração removida com sucesso');
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('Erro ao remover integração');
    }
  }, [fetchIntegrations]);

  const triggerSync = useCallback(async (integrationId: string) => {
    try {
      setSyncing(integrationId);
      
      const response = await fetch('/api/calendar/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sync',
          integrationId 
        })
      });

      if (!response.ok) throw new Error('Failed to trigger sync');
      
      toast.success('Sincronização iniciada');
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchIntegrations();
        fetchSyncEvents();
        fetchConflicts();
      }, 2000);
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error('Erro ao iniciar sincronização');
    } finally {
      setSyncing(null);
    }
  }, [fetchIntegrations, fetchSyncEvents, fetchConflicts]);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, resolution })
      });

      if (!response.ok) throw new Error('Failed to resolve conflict');
      
      await fetchConflicts();
      await fetchIntegrations();
      toast.success('Conflito resolvido com sucesso');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Erro ao resolver conflito');
    }
  }, [fetchConflicts, fetchIntegrations]);

  const resolveAllConflicts = useCallback(async (
    resolution: 'local' | 'remote' | 'newest'
  ) => {
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });

      if (!response.ok) throw new Error('Failed to resolve conflicts');
      
      await fetchConflicts();
      await fetchIntegrations();
      toast.success('Todos os conflitos foram resolvidos');
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      toast.error('Erro ao resolver conflitos');
    }
  }, [fetchConflicts, fetchIntegrations]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchIntegrations(),
        fetchSyncEvents(),
        fetchConflicts()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchIntegrations, fetchSyncEvents, fetchConflicts]);

  return {
    integrations,
    syncEvents,
    conflicts,
    loading,
    syncing,
    updateIntegration,
    deleteIntegration,
    triggerSync,
    resolveConflict,
    resolveAllConflicts,
    refresh: () => {
      fetchIntegrations();
      fetchSyncEvents();
      fetchConflicts();
    }
  };
}