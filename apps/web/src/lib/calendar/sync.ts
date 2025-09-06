import { CalendarOAuthService } from './oauth';
import { prisma } from '@hekate/database';
import { CalendarProvider, SyncDirection, SyncStatus } from '@/types/calendar';

export interface SyncOptions {
  integrationId: string;
  direction: SyncDirection;
  startDate?: Date;
  endDate?: Date;
}

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  conflicts: any[];
  errors: string[];
}

export class CalendarSyncService {
  private oauthService: CalendarOAuthService;

  constructor() {
    this.oauthService = new CalendarOAuthService();
  }

  async syncCalendar(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      conflicts: [],
      errors: [],
    };

    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: { id: options.integrationId },
        include: { user: true },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Create sync event record
      await prisma.calendarSyncEvent.create({
        data: {
          integrationId: integration.id,
          externalId: 'sync-' + Date.now(),
          operation: 'SYNC',
          direction: options.direction,
          status: SyncStatus.SYNCED,
          startedAt: new Date(),
          processedAt: new Date(),
        },
      });

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  async getIntegrations(userId: string) {
    return prisma.calendarIntegration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSyncEvents(integrationId: string) {
    return prisma.calendarSyncEvent.findMany({
      where: { integrationId },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
  }
}