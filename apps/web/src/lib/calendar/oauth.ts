import { google } from 'googleapis';
// import { Client } from '@microsoft/microsoft-graph-client';
// import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { prisma } from '@hekate/database';

export type CalendarProvider = 'GOOGLE' | 'OUTLOOK';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface CalendarAccount {
  id: string;
  email: string;
  name?: string;
}

// class CustomAuthProvider implements AuthenticationProvider {
//   constructor(private accessToken: string) {}

//   async getAccessToken(): Promise<string> {
//     return this.accessToken;
//   }
// }

export class CalendarOAuthService {
  private googleOAuth2Client: any;
  
  constructor() {
    this.googleOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/calendar/oauth/google/callback`
    );
  }

  /**
   * Gera URL de autorização para o provedor especificado
   */
  generateAuthUrl(provider: CalendarProvider, userId: string): string {
    switch (provider) {
      case 'GOOGLE':
        return this.generateGoogleAuthUrl(userId);
      case 'OUTLOOK':
        return this.generateOutlookAuthUrl(userId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Troca código de autorização por tokens
   */
  async exchangeCodeForTokens(
    provider: CalendarProvider,
    code: string,
    userId: string
  ): Promise<{ tokens: OAuthTokens; account: CalendarAccount }> {
    switch (provider) {
      case 'GOOGLE':
        return this.exchangeGoogleCode(code, userId);
      case 'OUTLOOK':
        return this.exchangeOutlookCode(code, userId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Atualiza tokens usando refresh token
   */
  async refreshTokens(
    provider: CalendarProvider,
    refreshToken: string
  ): Promise<OAuthTokens> {
    switch (provider) {
      case 'GOOGLE':
        return this.refreshGoogleTokens(refreshToken);
      case 'OUTLOOK':
        return this.refreshOutlookTokens(refreshToken);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Verifica se os tokens são válidos e os atualiza se necessário
   */
  async ensureValidTokens(integrationId: string): Promise<OAuthTokens> {
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Verificar se o token ainda é válido (com margem de 5 minutos)
    const now = new Date();
    const expiresAt = integration.tokenExpiresAt;
    const marginMs = 5 * 60 * 1000; // 5 minutos

    if (expiresAt && expiresAt.getTime() - now.getTime() > marginMs) {
      // Token ainda válido
      return {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || undefined,
        expiresAt: integration.tokenExpiresAt || undefined,
      };
    }

    // Token expirado ou prestes a expirar, tentar renovar
    if (!integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const newTokens = await this.refreshTokens(
      integration.provider as CalendarProvider,
      integration.refreshToken
    );

    // Atualizar tokens no banco
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken || integration.refreshToken,
        tokenExpiresAt: newTokens.expiresAt,
      },
    });

    return newTokens;
  }

  // Métodos privados para Google
  private generateGoogleAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.googleOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent',
    });
  }

  private async exchangeGoogleCode(
    code: string,
    userId: string
  ): Promise<{ tokens: OAuthTokens; account: CalendarAccount }> {
    const { tokens } = await this.googleOAuth2Client.getToken(code);
    this.googleOAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.googleOAuth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email || !userInfo.data.id) {
      throw new Error('Could not retrieve user information');
    }

    return {
      tokens: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
      account: {
        id: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name || undefined,
      },
    };
  }

  private async refreshGoogleTokens(refreshToken: string): Promise<OAuthTokens> {
    this.googleOAuth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.googleOAuth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    };
  }

  /**
   * Revoga token do Google
   */
  async revokeGoogleToken(accessToken: string): Promise<void> {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      console.warn('Failed to revoke Google token:', error);
      throw error;
    }
  }

  // Métodos privados para Outlook
  private generateOutlookAuthUrl(userId: string): string {
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
      state: userId,
      response_mode: 'query',
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private async exchangeOutlookCode(
    code: string,
    userId: string
  ): Promise<{ tokens: OAuthTokens; account: CalendarAccount }> {
    const tokenParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/oauth/outlook/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();

    // Obter informações do usuário a partir do Graph
    const meResp = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    if (!meResp.ok) {
      throw new Error('Failed to fetch user info from Microsoft Graph')
    }
    const userInfo: any = await meResp.json()

    const userEmail = userInfo.mail || userInfo.userPrincipalName
    if (!userEmail || !userInfo.id) {
      throw new Error('Could not retrieve user information')
    }

    return {
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      account: {
        id: userInfo.id,
        email: userEmail,
        name: userInfo.displayName || undefined,
      },
    }
  }

  private async refreshOutlookTokens(refreshToken: string): Promise<OAuthTokens> {
    const tokenParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh tokens');
    }

    const tokens = await tokenResponse.json();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }
}
