import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
      },
      // Removendo _count por problemas de tipo, estatísticas serão calculadas separadamente
    });

    // Se includeStats for true, buscar estatísticas adicionais
    const integrationsWithStats = includeStats
      ? await Promise.all(
          integrations.map(async (integration) => {
            const syncEvents = await prisma.calendarSyncEvent.findMany({
              where: {
                integrationId: integration.id,
              },
              orderBy: {
                startedAt: 'desc',
              },
              take: 100, // Últimos 100 eventos para calcular estatísticas
            });

            const totalSyncs = syncEvents.length;
            const successfulSyncs = syncEvents.filter(e => e.status === 'SYNCED').length;
            const failedSyncs = syncEvents.filter(e => e.status === 'FAILED').length;
            
            const pendingConflicts = await prisma.calendarConflict.count({
              where: {
                integrationId: integration.id,
                resolution: null,
              },
            });

            return {
              ...integration,
              stats: {
                totalSyncs,
                successfulSyncs,
                failedSyncs,
                pendingConflicts,
              },
            };
          })
        )
      : integrations;

    return NextResponse.json({
      integrations: integrationsWithStats,
    });
  } catch (error) {
    console.error('Error fetching calendar integrations:', error);
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
    const { provider, accessToken, refreshToken, externalAccountId, externalAccountEmail } = body;

    if (!provider || !accessToken || !externalAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma integração para este provedor e conta
    const existingIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        userId: session.user.id,
        provider,
        externalAccountId,
      },
    });

    if (existingIntegration) {
      // Atualizar tokens se já existe
      const updatedIntegration = await prisma.calendarIntegration.update({
        where: {
          id: existingIntegration.id,
        },
        data: {
          accessToken,
          refreshToken,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({ integration: updatedIntegration });
    }

    // Criar nova integração
    const integration = await prisma.calendarIntegration.create({
      data: {
        userId: session.user.id,
        provider,
        providerAccountId: externalAccountId || 'default',
        accessToken,
        refreshToken,
        externalAccountId,
        externalAccountEmail,
        isActive: true,
        syncEnabled: true,
      },
    });

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar integration:', error);
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

    const body = await request.json();
    const { integrationId, ...updateData } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verificar se a integração pertence ao usuário
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

    const updatedIntegration = await prisma.calendarIntegration.update({
      where: {
        id: integrationId,
      },
      data: updateData,
    });

    return NextResponse.json({ integration: updatedIntegration });
  } catch (error) {
    console.error('Error updating calendar integration:', error);
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

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verificar se a integração pertence ao usuário
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

    await prisma.calendarIntegration.delete({
      where: {
        id: integrationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}