import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EnhancedCalendarIntegrationService } from '@/lib/services/enhancedCalendarIntegration';
import { prisma } from '@hekate/database';
import { z } from 'zod';

const updateIntegrationSchema = z.object({
  isActive: z.boolean().optional(),
  syncEnabled: z.boolean().optional(),
  settings: z.object({
    syncDirection: z.enum(['import', 'export', 'bidirectional']).optional(),
    syncPrivateEvents: z.boolean().optional(),
    syncRecurringEvents: z.boolean().optional(),
    conflictResolution: z.enum(['local', 'remote', 'manual']).optional(),
    eventCategories: z.array(z.string()).optional(),
    reminderSettings: z.object({
      enabled: z.boolean(),
      defaultMinutes: z.array(z.number())
    }).optional()
  }).optional()
});

// GET /api/calendar/integrations/[id] - Get specific integration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error('Error fetching calendar integration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

// PATCH /api/calendar/integrations/[id] - Update integration settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify integration belongs to user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = updateIntegrationSchema.parse(body);

    // Update integration settings
    if (updateData.settings) {
      await EnhancedCalendarIntegrationService.updateIntegrationSettings(
        params.id,
        updateData.settings
      );
    }

    // Update active status
    if (typeof updateData.isActive === 'boolean') {
      await EnhancedCalendarIntegrationService.toggleIntegration(
        params.id,
        updateData.isActive
      );
    }

    // Update other fields
    const updatedIntegration = await prisma.calendarIntegration.update({
      where: { id: params.id },
      data: {
        ...(typeof updateData.syncEnabled === 'boolean' && { syncEnabled: updateData.syncEnabled })
      }
    });
    
    return NextResponse.json({
      success: true,
      data: updatedIntegration
    });
  } catch (error) {
    console.error('Error updating calendar integration:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/integrations/[id] - Delete integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify integration belongs to user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Delete integration
    await EnhancedCalendarIntegrationService.deleteIntegration(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}