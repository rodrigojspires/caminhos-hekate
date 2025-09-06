import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';

const outlookAuthSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

const MICROSOFT_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_LOGIN_BASE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';

// GET /api/calendar/auth/outlook - Initiate Microsoft OAuth
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const scopes = [
      'https://graph.microsoft.com/calendars.readwrite',
      'https://graph.microsoft.com/user.read',
    ];

    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/auth/outlook/callback`,
      scope: scopes.join(' '),
      state: session.user.id,
      prompt: 'consent', // Force consent to get refresh token
    });

    const authUrl = `${MICROSOFT_LOGIN_BASE_URL}/authorize?${params.toString()}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft OAuth' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/auth/outlook - Handle OAuth callback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, state } = outlookAuthSchema.parse(body);

    // Verify state matches user ID for security
    if (state && state !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${MICROSOFT_LOGIN_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/auth/outlook/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Microsoft token exchange error:', error);
      return NextResponse.json(
        { error: 'Failed to exchange code for tokens' },
        { status: 500 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user's Microsoft profile
    const profileResponse = await fetch(`${MICROSOFT_GRAPH_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to get Microsoft profile');
      return NextResponse.json(
        { error: 'Failed to get Microsoft profile' },
        { status: 500 }
      );
    }

    const profile = await profileResponse.json();

    // Get user's default calendar
    const calendarResponse = await fetch(`${MICROSOFT_GRAPH_BASE_URL}/me/calendar`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let calendarInfo = null;
    if (calendarResponse.ok) {
      calendarInfo = await calendarResponse.json();
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Store or update integration
    const integration = await prisma.calendarIntegration.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId: session.user.id,
          provider: 'OUTLOOK',
          providerAccountId: profile.id,
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt,
        isActive: true,
        syncEnabled: true,
        settings: {
          calendarId: calendarInfo?.id,
          calendarName: calendarInfo?.name || 'Calendar',
          timeZone: profile.mailboxSettings?.timeZone || 'UTC',
          userPrincipalName: profile.userPrincipalName,
        },
      },
      create: {
        userId: session.user.id,
        provider: 'OUTLOOK',
        providerAccountId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt,
        isActive: true,
        syncEnabled: true,
        settings: {
          calendarId: calendarInfo?.id,
          calendarName: calendarInfo?.name || 'Calendar',
          timeZone: profile.mailboxSettings?.timeZone || 'UTC',
          userPrincipalName: profile.userPrincipalName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        isActive: integration.isActive,
        syncEnabled: integration.syncEnabled,
        settings: integration.settings,
      },
    });
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Failed to complete Microsoft OAuth' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/auth/outlook - Revoke Microsoft integration
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find and deactivate Microsoft integration
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider: 'OUTLOOK',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Microsoft integration not found' },
        { status: 404 }
      );
    }

    // Note: Microsoft doesn't provide a direct token revocation endpoint
    // The tokens will expire naturally or can be revoked through Azure portal

    // Deactivate integration
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        isActive: false,
        syncEnabled: false,
        accessToken: '', // Clear sensitive data
        refreshToken: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Microsoft OAuth revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke Microsoft integration' },
      { status: 500 }
    );
  }
}