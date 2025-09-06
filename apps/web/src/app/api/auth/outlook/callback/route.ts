import { NextRequest, NextResponse } from 'next/server';
import { EnhancedCalendarIntegrationService } from '@/lib/services/enhancedCalendarIntegration';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Outlook OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=missing_parameters', request.url)
      );
    }

    try {
      // Verify state parameter
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      if (stateData.userId !== session.user.id) {
        return NextResponse.redirect(
          new URL('/dashboard/settings/integrations?error=invalid_state', request.url)
        );
      }

      // Handle the OAuth callback
      const integration = await EnhancedCalendarIntegrationService.handleAuthCallback(
        'outlook',
        code,
        state
      );

      // Redirect to success page
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?success=outlook_connected&integration=${integration.id}`, request.url)
      );
    } catch (error) {
      console.error('Error handling Outlook OAuth callback:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent('connection_failed')}`, request.url)
      );
    }
  } catch (error) {
    console.error('Unexpected error in Outlook OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?error=unexpected_error', request.url)
    );
  }
}