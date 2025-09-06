import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
// import { Client } from '@microsoft/microsoft-graph-client';
// import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

// class CustomAuthProvider implements AuthenticationProvider {
//   constructor(private accessToken: string) {}

//   async getAccessToken(): Promise<string> {
//     return this.accessToken;
//   }
// }

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'authorize') {
      // Gerar URL de autorização
      const scopes = [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ];

      const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        response_type: 'code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/oauth/outlook/callback`,
        scope: scopes.join(' '),
        state: session.user.id,
        response_mode: 'query',
        prompt: 'consent',
      });

      const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`;

      return NextResponse.json({ authUrl });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in Outlook OAuth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Verificar se o state corresponde ao usuário atual
    if (state !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Trocar código por tokens
    const tokenParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/oauth/outlook/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Obter informações do usuário
    // const authProvider = new CustomAuthProvider(tokens.access_token);
    // const graphClient = Client.initWithMiddleware({ authProvider });

    // const userInfo = await graphClient.api('/me').get();
    const userInfo = { id: 'temp-id', mail: 'temp@example.com', userPrincipalName: 'temp@example.com' };

    if (!userInfo.mail && !userInfo.userPrincipalName) {
      return NextResponse.json(
        { error: 'Could not retrieve user email' },
        { status: 400 }
      );
    }

    const userEmail = userInfo.mail || userInfo.userPrincipalName;

    // Verificar se já existe uma integração para este email
    const existingIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider: 'OUTLOOK',
        providerAccountId: userInfo.id,
      },
    });

    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    if (existingIntegration) {
      // Atualizar tokens da integração existente
      const updatedIntegration = await prisma.calendarIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingIntegration.refreshToken,
          tokenExpiresAt,
          isActive: true,
          lastSyncAt: null, // Reset para forçar nova sincronização
        },
      });

      return NextResponse.json({
        integration: {
          id: updatedIntegration.id,
          provider: updatedIntegration.provider,
          isActive: updatedIntegration.isActive,
        },
        message: 'Integration updated successfully',
      });
    } else {
      // Criar nova integração
      const newIntegration = await prisma.calendarIntegration.create({
        data: {
          userId: session.user.id,
          provider: 'OUTLOOK',
          providerAccountId: userInfo.id,
          externalAccountId: userInfo.id,
          externalAccountEmail: userEmail,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          isActive: true,
        },
      });

      return NextResponse.json({
        integration: {
          id: newIntegration.id,
          provider: newIntegration.provider,
          isActive: newIntegration.isActive,
        },
        message: 'Integration created successfully',
      });
    }
  } catch (error) {
    console.error('Error processing Outlook OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to process authorization' },
      { status: 500 }
    );
  }
}