import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@hekate/database';

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['immediate', 'hourly', 'daily']),
  channels: z.object({
    browser: z.boolean(),
    email: z.boolean(),
    push: z.boolean()
  }),
  events: z.object({
    syncSuccess: z.boolean(),
    syncError: z.boolean(),
    syncWarning: z.boolean(),
    conflict: z.boolean(),
    integrationConnected: z.boolean(),
    integrationDisconnected: z.boolean()
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Try to get existing settings from database
    const userSettings = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        calendarNotificationSettings: true
      }
    });
    
    // Default settings if none exist
    const defaultSettings = {
      enabled: true,
      frequency: 'immediate' as const,
      channels: {
        browser: true,
        email: false,
        push: false
      },
      events: {
        syncSuccess: false,
        syncError: true,
        syncWarning: true,
        conflict: true,
        integrationConnected: true,
        integrationDisconnected: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
    
    const settings = userSettings?.calendarNotificationSettings 
      ? JSON.parse(userSettings.calendarNotificationSettings as string)
      : defaultSettings;
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    
    // Validate the request body
    const validatedSettings = notificationSettingsSchema.parse(body);
    
    // Update user settings in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarNotificationSettings: JSON.stringify(validatedSettings)
      }
    });
    
    return NextResponse.json({
      message: 'Notification settings updated successfully',
      settings: validatedSettings
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings format', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Reset to default settings
    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarNotificationSettings: null
      }
    });
    
    return NextResponse.json({
      message: 'Notification settings reset to default'
    });
  } catch (error) {
    console.error('Error resetting notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}