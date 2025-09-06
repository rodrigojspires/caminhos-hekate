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

    if (error) {
      return NextResponse.json(
        { error: `Google OAuth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code) {
      // Generate authorization URL
      const oauthService = new CalendarOAuthService();
      const authUrl = oauthService.generateAuthUrl('GOOGLE', session.user.id);
      return NextResponse.json({ authUrl });
    }

    // Exchange code for tokens
    const oauthService = new CalendarOAuthService();
    const { tokens: tokenData, account: userInfo } = await oauthService.exchangeCodeForTokens('GOOGLE', code, session.user.id);

    // User info is already obtained from the OAuth service

    // Check if integration already exists
    const existingIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider: CalendarProvider.GOOGLE,
        externalAccountId: userInfo.id
      }
    });

    let integration;
    if (existingIntegration) {
      // Update existing integration
      integration = await prisma.calendarIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          isActive: true,
          lastSyncAt: null // Reset sync status
        }
      });
    } else {
      // Create new integration
      integration = await prisma.calendarIntegration.create({
        data: {
          userId: session.user.id,
          provider: CalendarProvider.GOOGLE,
          providerAccountId: userInfo.id,
          externalAccountId: userInfo.id,
          externalAccountEmail: userInfo.email,
          name: userInfo.name || userInfo.email,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          isActive: true
        }
      });

      // Create default field mapping
      await prisma.calendarFieldMapping.create({
        data: {
          integrationId: integration.id,
          mappings: {
            title: 'summary',
            description: 'description',
            startDate: 'start.dateTime',
            endDate: 'end.dateTime',
            location: 'location',
            isAllDay: 'start.date'
          }
        }
      });

      // Create default privacy settings
      await prisma.calendarPrivacySettings.create({
        data: {
          integrationId: integration.id,
          syncPrivateEvents: false,
          syncAllDayEvents: true,
          syncRecurringEvents: true,
          syncEventTitle: true,
          syncEventDescription: false,
          syncEventLocation: true,
          syncEventAttendees: false,
          syncEventAttachments: false,
          anonymizeTitle: false,
          anonymizeDescription: false,
          anonymizeLocation: false,
          anonymizeAttendees: false,
          timeFilterEnabled: false,
          timeFilterStart: '09:00',
          timeFilterEnd: '17:00',
          keywordFilterEnabled: false,
          includeKeywords: [],
          excludeKeywords: [],
          customRules: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        name: integration.name,
        externalAccountEmail: integration.externalAccountEmail,
        isActive: integration.isActive
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Google' },
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
          provider: CalendarProvider.GOOGLE
        }
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      // Revoke Google token
      try {
        const oauthService = new CalendarOAuthService();
        await oauthService.revokeGoogleToken(integration.accessToken);
      } catch (error) {
        console.warn('Failed to revoke Google token:', error);
      }

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
    console.error('Google OAuth POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}