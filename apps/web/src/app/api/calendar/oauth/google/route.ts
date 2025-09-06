import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/calendar/oauth/google/callback`
);

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
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: session.user.id, // Passar o ID do usuário no state
        prompt: 'consent', // Forçar consentimento para obter refresh token
      });

      return NextResponse.json({ authUrl });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in Google OAuth:', error);
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
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Obter informações do usuário
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      return NextResponse.json(
        { error: 'Could not retrieve user email' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma integração para este usuário e provider
    const existingIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider: 'GOOGLE',
        providerAccountId: userInfo.data.id!,
      },
    });

    if (existingIntegration) {
      // Atualizar tokens da integração existente
      const updatedIntegration = await prisma.calendarIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || existingIntegration.refreshToken,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
          lastSyncAt: null, // Reset para forçar nova sincronização
        },
      });

      return NextResponse.json({
        integration: {
          id: updatedIntegration.id,
          provider: updatedIntegration.provider,
          providerAccountId: updatedIntegration.providerAccountId,
          isActive: updatedIntegration.isActive,
        },
        message: 'Integration updated successfully',
      });
    } else {
      // Criar nova integração
      const newIntegration = await prisma.calendarIntegration.create({
        data: {
          userId: session.user.id,
          provider: 'GOOGLE',
          providerAccountId: userInfo.data.id!,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
        },
      });

      return NextResponse.json({
        integration: {
          id: newIntegration.id,
          provider: newIntegration.provider,
          providerAccountId: newIntegration.providerAccountId,
          isActive: newIntegration.isActive,
        },
        message: 'Integration created successfully',
      });
    }
  } catch (error) {
    console.error('Error processing Google OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to process authorization' },
      { status: 500 }
    );
  }
}