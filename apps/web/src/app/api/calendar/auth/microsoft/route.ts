import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CalendarOAuthService } from '@/lib/calendar/oauth';
import { prisma } from '@hekate/database';
import { CalendarProvider } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      return NextResponse.json(
        { error: `Microsoft OAuth error: ${error} - ${errorDescription}` },
        { status: 400 }
      );
    }

    if (!code) {
      // Generate authorization URL
      const oauthService = new CalendarOAuthService();
      const authUrl = await oauthService.generateAuthUrl('OUTLOOK', session.user.id);
      return NextResponse.json({ authUrl });
    }

    // Exchange code for tokens
    const oauthService = new CalendarOAuthService();
    const tokenData = await oauthService.exchangeCodeForTokens('OUTLOOK', code, session.user.id);

    // Extract user info from token data
    const userInfo = tokenData.account;

    // Check if integration already exists
    const existingIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider: CalendarProvider.OUTLOOK,
        externalAccountId: userInfo.id
      }
    });

    let integration;
    if (existingIntegration) {
      // Update existing integration
      integration = await prisma.calendarIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokenData.tokens.accessToken,
          refreshToken: tokenData.tokens.refreshToken,
          tokenExpiresAt: tokenData.tokens.expiresAt,
          isActive: true,
          lastSyncAt: null // Reset sync status
        }
      });
    } else {
      // Create new integration
      integration = await prisma.calendarIntegration.create({
        data: {
          userId: session.user.id,
          provider: CalendarProvider.OUTLOOK,
          providerAccountId: userInfo.id,
          externalAccountId: userInfo.id,
          externalAccountEmail: userInfo.email || userInfo.id,
          name: userInfo.name || userInfo.email || userInfo.id,
          accessToken: tokenData.tokens.accessToken,
          refreshToken: tokenData.tokens.refreshToken,
          tokenExpiresAt: tokenData.tokens.expiresAt,
          isActive: true
        }
      });

      // Create default field mapping
      await prisma.calendarFieldMapping.create({
        data: {
          integrationId: integration.id,
          mappings: {
            title: 'subject',
            description: 'body.content',
            startDate: 'start.dateTime',
            endDate: 'end.dateTime',
            location: 'location.displayName',
            isAllDay: 'isAllDay'
          }
        }
      });

      // Create default privacy settings
      const privacySettings = await prisma.calendarPrivacySettings.create({
        data: {
          integrationId: integration.id,
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
          keywordFilterEnabled: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        isActive: integration.isActive
      }
    });
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Microsoft' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, integrationId } = await request.json();

    if (action === 'disconnect') {
      if (!integrationId) {
        return NextResponse.json(
          { error: 'Integration ID is required' },
          { status: 400 }
        );
      }

      const integration = await prisma.calendarIntegration.findFirst({
        where: {
          id: integrationId,
          userId: session.user.id,
          provider: CalendarProvider.OUTLOOK
        }
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      // Note: Microsoft token revocation would be handled here if needed
      // For now, we just deactivate the integration

      // Deactivate integration
      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          isActive: false,
          accessToken: '',
          refreshToken: null,
          tokenExpiresAt: null
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Microsoft OAuth POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}