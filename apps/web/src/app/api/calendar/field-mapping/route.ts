import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';

const fieldMappingSchema = z.object({
  integrationId: z.string(),
  mappings: z.array(z.object({
    id: z.string(),
    hekateField: z.string(),
    externalField: z.string(),
    direction: z.enum(['bidirectional', 'import_only', 'export_only']),
    transformation: z.string().optional(),
    isRequired: z.boolean(),
    defaultValue: z.string().optional(),
  })),
});

// Default field mappings for different providers
const DEFAULT_MAPPINGS = {
  GOOGLE: [
    {
      id: 'title',
      hekateField: 'title',
      externalField: 'summary',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'description',
      hekateField: 'description',
      externalField: 'description',
      direction: 'bidirectional' as const,
      isRequired: false,
    },
    {
      id: 'startTime',
      hekateField: 'startTime',
      externalField: 'start.dateTime',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'endTime',
      hekateField: 'endTime',
      externalField: 'end.dateTime',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'location',
      hekateField: 'location',
      externalField: 'location',
      direction: 'bidirectional' as const,
      isRequired: false,
    },
    {
      id: 'attendees',
      hekateField: 'attendees',
      externalField: 'attendees',
      direction: 'bidirectional' as const,
      isRequired: false,
      transformation: 'email_list',
    },
    {
      id: 'isPrivate',
      hekateField: 'isPrivate',
      externalField: 'visibility',
      direction: 'bidirectional' as const,
      isRequired: false,
      transformation: 'visibility_to_boolean',
    },
  ],
  OUTLOOK: [
    {
      id: 'title',
      hekateField: 'title',
      externalField: 'subject',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'description',
      hekateField: 'description',
      externalField: 'body.content',
      direction: 'bidirectional' as const,
      isRequired: false,
    },
    {
      id: 'startTime',
      hekateField: 'startTime',
      externalField: 'start.dateTime',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'endTime',
      hekateField: 'endTime',
      externalField: 'end.dateTime',
      direction: 'bidirectional' as const,
      isRequired: true,
    },
    {
      id: 'location',
      hekateField: 'location',
      externalField: 'location.displayName',
      direction: 'bidirectional' as const,
      isRequired: false,
    },
    {
      id: 'attendees',
      hekateField: 'attendees',
      externalField: 'attendees',
      direction: 'bidirectional' as const,
      isRequired: false,
      transformation: 'outlook_attendees',
    },
    {
      id: 'isPrivate',
      hekateField: 'isPrivate',
      externalField: 'sensitivity',
      direction: 'bidirectional' as const,
      isRequired: false,
      transformation: 'sensitivity_to_boolean',
    },
  ],
};

// GET /api/calendar/field-mapping - Get field mappings for an integration
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

    // Get field mappings
    const fieldMapping = await prisma.calendarFieldMapping.findFirst({
      where: {
        integrationId,
      },
    });

    if (!fieldMapping) {
      // Return default mappings if none exist
      const defaultMappings = DEFAULT_MAPPINGS[integration.provider as keyof typeof DEFAULT_MAPPINGS] || [];
      
      return NextResponse.json({
        integrationId,
        provider: integration.provider,
        mappings: defaultMappings,
        isDefault: true,
      });
    }

    return NextResponse.json({
      integrationId: fieldMapping.integrationId,
      provider: integration.provider,
      mappings: fieldMapping.mappings as any[],
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field mappings' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/field-mapping - Save field mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = fieldMappingSchema.parse(body);

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

    // Validate mappings
    const requiredFields = data.mappings.filter(m => m.isRequired);
    if (requiredFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one required field mapping must be defined' },
        { status: 400 }
      );
    }

    // Check for duplicate Hekate fields
    const hekateFields = data.mappings.map(m => m.hekateField);
    const duplicateFields = hekateFields.filter((field, index) => hekateFields.indexOf(field) !== index);
    if (duplicateFields.length > 0) {
      return NextResponse.json(
        { error: `Duplicate Hekate fields found: ${duplicateFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert field mappings
    const fieldMapping = await prisma.calendarFieldMapping.upsert({
      where: {
        integrationId: data.integrationId,
      },
      create: {
        integrationId: data.integrationId,
        mappings: data.mappings,
      },
      update: {
        mappings: data.mappings,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      integrationId: fieldMapping.integrationId,
      provider: integration.provider,
      mappings: fieldMapping.mappings as any[],
      isDefault: false,
    });
  } catch (error) {
    console.error('Error saving field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to save field mappings' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/field-mapping - Reset to default mappings
export async function DELETE(request: NextRequest) {
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

    // Delete custom field mappings (will fall back to defaults)
    await prisma.calendarFieldMapping.deleteMany({
      where: {
        integrationId,
      },
    });

    // Return default mappings
    const defaultMappings = DEFAULT_MAPPINGS[integration.provider as keyof typeof DEFAULT_MAPPINGS] || [];
    
    return NextResponse.json({
      integrationId,
      provider: integration.provider,
      mappings: defaultMappings,
      isDefault: true,
    });
  } catch (error) {
    console.error('Error resetting field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to reset field mappings' },
      { status: 500 }
    );
  }
}