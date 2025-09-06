import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';

const privacySettingsSchema = z.object({
  integrationId: z.string(),
  syncPrivateEvents: z.boolean(),
  syncAllDayEvents: z.boolean(),
  syncRecurringEvents: z.boolean(),
  syncEventTitle: z.boolean(),
  syncEventDescription: z.boolean(),
  syncEventLocation: z.boolean(),
  syncEventAttendees: z.boolean(),
  syncEventAttachments: z.boolean(),
  anonymizeTitle: z.boolean(),
  anonymizeDescription: z.boolean(),
  anonymizeLocation: z.boolean(),
  anonymizeAttendees: z.boolean(),
  timeFilterEnabled: z.boolean(),
  timeFilterStart: z.string().optional(),
  timeFilterEnd: z.string().optional(),
  keywordFilterEnabled: z.boolean(),
  includeKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  customRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    condition: z.string(),
    action: z.enum(['include', 'exclude', 'anonymize']),
    enabled: z.boolean(),
  })).optional(),
});

// GET /api/calendar/privacy - Get privacy settings for an integration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verify the integration belongs to the user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Get privacy settings
    const privacySettings = await prisma.calendarPrivacySettings.findFirst({
      where: {
        integrationId,
      },
    });

    if (!privacySettings) {
      // Return default settings if none exist
      const defaultSettings = {
        integrationId,
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
        anonymizeAttendees: false,
        timeFilterEnabled: false,
        timeFilterStart: null,
        timeFilterEnd: null,
        keywordFilterEnabled: false,
        includeKeywords: [],
        excludeKeywords: [],
        customRules: [],
      };

      return NextResponse.json({ settings: defaultSettings });
    }

    // Transform settings for response
    const settings = {
      integrationId: privacySettings.integrationId,
      syncPrivateEvents: privacySettings.syncPrivateEvents,
      syncAllDayEvents: privacySettings.syncAllDayEvents,
      syncRecurringEvents: privacySettings.syncRecurringEvents,
      syncEventTitle: privacySettings.syncEventTitle,
      syncEventDescription: privacySettings.syncEventDescription,
      syncEventLocation: privacySettings.syncEventLocation,
      syncEventAttendees: privacySettings.syncEventAttendees,
      syncEventAttachments: privacySettings.syncEventAttachments,
      anonymizeTitle: privacySettings.anonymizeTitle,
      anonymizeDescription: privacySettings.anonymizeDescription,
      anonymizeLocation: privacySettings.anonymizeLocation,
      anonymizeAttendees: privacySettings.anonymizeAttendees,
      timeFilterEnabled: privacySettings.timeFilterEnabled,
      timeFilterStart: privacySettings.timeFilterStart,
      timeFilterEnd: privacySettings.timeFilterEnd,
      keywordFilterEnabled: privacySettings.keywordFilterEnabled,
      includeKeywords: (privacySettings.includeKeywords as string[]) || [],
      excludeKeywords: (privacySettings.excludeKeywords as string[]) || [],
      customRules: (privacySettings.customRules as any[]) || [],
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/privacy - Save privacy settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = privacySettingsSchema.parse(body);

    // Verify the integration belongs to the user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: data.integrationId,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Upsert privacy settings
    const privacySettings = await prisma.calendarPrivacySettings.upsert({
      where: {
        integrationId: data.integrationId,
      },
      create: {
        integrationId: data.integrationId,
        syncPrivateEvents: data.syncPrivateEvents,
        syncAllDayEvents: data.syncAllDayEvents,
        syncRecurringEvents: data.syncRecurringEvents,
        syncEventTitle: data.syncEventTitle,
        syncEventDescription: data.syncEventDescription,
        syncEventLocation: data.syncEventLocation,
        syncEventAttendees: data.syncEventAttendees,
        syncEventAttachments: data.syncEventAttachments,
        anonymizeTitle: data.anonymizeTitle,
        anonymizeDescription: data.anonymizeDescription,
        anonymizeLocation: data.anonymizeLocation,
        anonymizeAttendees: data.anonymizeAttendees,
        timeFilterEnabled: data.timeFilterEnabled,
        timeFilterStart: data.timeFilterStart,
        timeFilterEnd: data.timeFilterEnd,
        keywordFilterEnabled: data.keywordFilterEnabled,
        includeKeywords: data.includeKeywords || [],
        excludeKeywords: data.excludeKeywords || [],
        customRules: data.customRules || [],
      },
      update: {
        syncPrivateEvents: data.syncPrivateEvents,
        syncAllDayEvents: data.syncAllDayEvents,
        syncRecurringEvents: data.syncRecurringEvents,
        syncEventTitle: data.syncEventTitle,
        syncEventDescription: data.syncEventDescription,
        syncEventLocation: data.syncEventLocation,
        syncEventAttendees: data.syncEventAttendees,
        syncEventAttachments: data.syncEventAttachments,
        anonymizeTitle: data.anonymizeTitle,
        anonymizeDescription: data.anonymizeDescription,
        anonymizeLocation: data.anonymizeLocation,
        anonymizeAttendees: data.anonymizeAttendees,
        timeFilterEnabled: data.timeFilterEnabled,
        timeFilterStart: data.timeFilterStart,
        timeFilterEnd: data.timeFilterEnd,
        keywordFilterEnabled: data.keywordFilterEnabled,
        includeKeywords: data.includeKeywords || [],
        excludeKeywords: data.excludeKeywords || [],
        customRules: data.customRules || [],
        updatedAt: new Date(),
      },
    });

    // Transform settings for response
    const settings = {
      integrationId: privacySettings.integrationId,
      syncPrivateEvents: privacySettings.syncPrivateEvents,
      syncAllDayEvents: privacySettings.syncAllDayEvents,
      syncRecurringEvents: privacySettings.syncRecurringEvents,
      syncEventTitle: privacySettings.syncEventTitle,
      syncEventDescription: privacySettings.syncEventDescription,
      syncEventLocation: privacySettings.syncEventLocation,
      syncEventAttendees: privacySettings.syncEventAttendees,
      syncEventAttachments: privacySettings.syncEventAttachments,
      anonymizeTitle: privacySettings.anonymizeTitle,
      anonymizeDescription: privacySettings.anonymizeDescription,
      anonymizeLocation: privacySettings.anonymizeLocation,
      anonymizeAttendees: privacySettings.anonymizeAttendees,
      timeFilterEnabled: privacySettings.timeFilterEnabled,
      timeFilterStart: privacySettings.timeFilterStart,
      timeFilterEnd: privacySettings.timeFilterEnd,
      keywordFilterEnabled: privacySettings.keywordFilterEnabled,
      includeKeywords: (privacySettings.includeKeywords as string[]) || [],
      excludeKeywords: (privacySettings.excludeKeywords as string[]) || [],
      customRules: (privacySettings.customRules as any[]) || [],
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error saving privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to save privacy settings' },
      { status: 500 }
    );
  }
}