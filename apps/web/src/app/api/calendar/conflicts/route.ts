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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar integrações do usuário
    const userIntegrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const integrationIds = userIntegrations.map(i => i.id);

    if (integrationIds.length === 0) {
      return NextResponse.json({
        conflicts: [],
        total: 0,
      });
    }

    // Construir filtros
    const where: any = {
      integrationId: {
        in: integrationIds,
      },
    };

    if (status) {
      where.resolution = status === 'PENDING' ? null : { not: null };
    }

    // Buscar conflitos
    const conflicts = await prisma.calendarConflict.findMany({
      where,
      include: {
        integration: {
          select: {
            provider: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Contar total de conflitos
    const total = await prisma.calendarConflict.count({
      where,
    });

    // Formatar dados para o frontend
    const formattedConflicts = conflicts.map(conflict => ({
      id: conflict.id,
      provider: conflict.integration.provider,
      conflictType: conflict.conflictType,
      description: conflict.description,
      localEvent: conflict.localData,
      externalEvent: conflict.externalData,
      createdAt: conflict.createdAt,
      resolvedAt: conflict.resolvedAt,
      resolution: conflict.resolution,
    }));

    return NextResponse.json({
      conflicts: formattedConflicts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching calendar conflicts:', error);
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
    const { conflictId, resolution } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { error: 'Conflict ID and resolution are required' },
        { status: 400 }
      );
    }

    // Verificar se o conflito existe e pertence ao usuário
    const conflict = await prisma.calendarConflict.findFirst({
      where: {
        id: conflictId,
        integration: {
          userId: session.user.id,
        },
      },
      include: {
        integration: true,
      },
    });

    if (!conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    if (conflict.resolution !== null) {
      return NextResponse.json(
        { error: 'Conflict already resolved' },
        { status: 400 }
      );
    }

    // Validar resolução
    const validResolutions = ['KEEP_LOCAL', 'KEEP_EXTERNAL', 'IGNORE', 'MERGE'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution' },
        { status: 400 }
      );
    }

    // Atualizar conflito
    const updatedConflict = await prisma.calendarConflict.update({
      where: {
        id: conflictId,
      },
      data: {
        resolution,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
      },
    });

    // Aqui você pode implementar a lógica específica para cada tipo de resolução
    // Por exemplo, se for KEEP_LOCAL, manter o evento local e ignorar o externo
    // Se for KEEP_EXTERNAL, atualizar o evento local com dados do externo
    // etc.

    return NextResponse.json({
      conflict: updatedConflict,
      message: 'Conflict resolved successfully',
    });
  } catch (error) {
    console.error('Error resolving calendar conflict:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}