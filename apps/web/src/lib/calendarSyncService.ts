import { prisma } from '@hekate/database';
import { EnhancedCalendarIntegrationService } from '@/lib/services/enhancedCalendarIntegration';
import { sendNotificationToUser } from '@/lib/notification-stream';
import { CalendarProvider, SyncStatus } from '@prisma/client';

interface SyncJob {
  id: string;
  userId: string;
  integrationId: string;
  provider: CalendarProvider;
  scheduledAt: Date;
  retryCount: number;
}

class CalendarSyncService {
  private syncQueue: SyncJob[] = [];
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private integrationService: typeof EnhancedCalendarIntegrationService;

  constructor() {
    this.integrationService = EnhancedCalendarIntegrationService;
    this.startSyncScheduler();
  }

  /**
   * Start the sync scheduler that runs every 5 minutes
   */
  private startSyncScheduler() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.scheduleAutomaticSyncs();
      await this.processSyncQueue();
    }, 5 * 60 * 1000); // 5 minutes

    // Run immediately on startup
    this.scheduleAutomaticSyncs();
  }

  /**
   * Stop the sync scheduler
   */
  public stopSyncScheduler() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Schedule automatic syncs based on user preferences
   */
  private async scheduleAutomaticSyncs() {
    try {
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          isActive: true,
          syncEnabled: true,
          OR: [
            {
              lastSyncAt: null
            },
            {
              AND: [
                { syncFrequency: 'hourly' },
                { lastSyncAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }
              ]
            },
            {
              AND: [
                { syncFrequency: 'daily' },
                { lastSyncAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
              ]
            },
            {
              AND: [
                { syncFrequency: 'weekly' },
                { lastSyncAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
              ]
            }
          ]
        },
        include: {
          user: true
        }
      });

      for (const integration of integrations) {
        // Check if already in queue
        const existingJob = this.syncQueue.find(
          job => job.integrationId === integration.id
        );

        if (!existingJob) {
          this.addSyncJob({
            id: `auto-${integration.id}-${Date.now()}`,
            userId: integration.userId,
            integrationId: integration.id,
            provider: integration.provider,
            scheduledAt: new Date(),
            retryCount: 0
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling automatic syncs:', error);
    }
  }

  /**
   * Add a sync job to the queue
   */
  public addSyncJob(job: SyncJob) {
    this.syncQueue.push(job);
    
    // Sort by scheduled time
    this.syncQueue.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.syncQueue.length > 0) {
        const job = this.syncQueue.shift();
        if (!job) break;

        // Check if it's time to process this job
        if (job.scheduledAt > new Date()) {
          // Put it back and wait
          this.syncQueue.unshift(job);
          break;
        }

        await this.processSyncJob(job);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync job
   */
  private async processSyncJob(job: SyncJob) {
    try {
      console.log(`Processing sync job ${job.id} for integration ${job.integrationId}`);

      // Get integration details
      const integration = await prisma.calendarIntegration.findUnique({
        where: { id: job.integrationId },
        include: { user: true }
      });

      if (!integration || !integration.isActive) {
        console.log(`Integration ${job.integrationId} not found or inactive`);
        return;
      }

      // Update sync status to in progress
      await prisma.calendarIntegration.update({
        where: { id: job.integrationId },
        data: {
          syncStatus: SyncStatus.PENDING,
          lastSyncAt: new Date()
        }
      });

      // Perform the sync
      const result = await this.integrationService.syncCalendar(job.integrationId);

      // Update integration with sync results
      await prisma.calendarIntegration.update({
        where: { id: job.integrationId },
        data: {
          syncStatus: result.success ? SyncStatus.SYNCED : SyncStatus.FAILED,
          lastSyncAt: new Date(),
          syncError: result.success ? null : (result.errors?.join('; ') || 'Unknown error')
        }
      });

      // Send notification to user
      if (result.success) {
        sendNotificationToUser(job.userId, {
          type: 'sync_success',
          title: 'Sincronização Concluída',
          message: `Calendário ${integration.provider} sincronizado com sucesso`,
          data: {
            integrationId: job.integrationId,
            provider: job.provider,
            eventsProcessed: (result.imported || 0) + (result.exported || 0) + (result.updated || 0),
            conflicts: result.conflicts?.length || 0
          }
        });
      } else {
        sendNotificationToUser(job.userId, {
          type: 'sync_error',
          title: 'Erro na Sincronização',
          message: `Falha ao sincronizar calendário ${integration.provider}: ${(result.errors && result.errors[0]) || 'Erro desconhecido'}`,
          data: {
            integrationId: job.integrationId,
            provider: job.provider,
            error: (result.errors && result.errors[0]) || 'Unknown error'
          }
        });
      }

      console.log(`Sync job ${job.id} completed:`, result);
    } catch (error) {
      console.error(`Error processing sync job ${job.id}:`, error);

      // Update integration with error status
      await prisma.calendarIntegration.update({
        where: { id: job.integrationId },
        data: {
          syncStatus: SyncStatus.FAILED,
          syncError: error instanceof Error ? error.message : 'Unknown error'
        }
      }).catch(console.error);

      // Send error notification
      sendNotificationToUser(job.userId, {
        type: 'sync_error',
        title: 'Erro na Sincronização',
        message: `Erro interno ao sincronizar calendário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        data: {
          integrationId: job.integrationId,
          provider: job.provider,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Manually trigger sync for a specific integration
   */
  public async triggerManualSync(userId: string, integrationId: string): Promise<void> {
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId, userId }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const job: SyncJob = {
      id: `manual-${integrationId}-${Date.now()}`,
      userId,
      integrationId,
      provider: integration.provider,
      scheduledAt: new Date(),
      retryCount: 0
    };

    this.addSyncJob(job);
  }

  /**
   * Get sync queue status
   */
  public getSyncQueueStatus() {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      nextJob: this.syncQueue[0] || null
    };
  }

  /**
   * Clear sync queue for a specific user
   */
  public clearUserSyncJobs(userId: string) {
    this.syncQueue = this.syncQueue.filter(job => job.userId !== userId);
  }
}

// Export singleton instance
export const calendarSyncService = new CalendarSyncService();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down calendar sync service...');
  calendarSyncService.stopSyncScheduler();
});

process.on('SIGINT', () => {
  console.log('Shutting down calendar sync service...');
  calendarSyncService.stopSyncScheduler();
});