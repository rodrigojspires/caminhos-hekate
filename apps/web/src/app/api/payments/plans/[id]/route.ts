import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hekate/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

const UpdatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  yearlyPrice: z.coerce.number().min(0).optional(),
  appScope: z.enum(['CAMINHOS', 'MAHALILAH', 'SHARED']).optional(),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  intervalCount: z.coerce.number().int().min(1).max(24).optional(),
  trialDays: z.coerce.number().int().min(0).max(365).optional(),
  features: z.unknown().optional(),
  maxCourses: z.union([z.coerce.number().int(), z.null()]).optional(),
  maxDownloads: z.union([z.coerce.number().int(), z.null()]).optional(),
  metadata: z.unknown().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            userSubscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription plan not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plan',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const data = UpdatePlanSchema.parse(body)

    const plan = await prisma.subscriptionPlan.update({
      where: {
        id,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.monthlyPrice !== undefined ? { monthlyPrice: data.monthlyPrice } : {}),
        ...(data.yearlyPrice !== undefined ? { yearlyPrice: data.yearlyPrice } : {}),
        ...(data.appScope !== undefined ? { appScope: data.appScope as any } : {}),
        ...(data.interval !== undefined ? { interval: data.interval as any } : {}),
        ...(data.intervalCount !== undefined ? { intervalCount: data.intervalCount } : {}),
        ...(data.trialDays !== undefined ? { trialDays: data.trialDays } : {}),
        ...(data.features !== undefined ? { features: data.features as any } : {}),
        ...(data.maxCourses !== undefined ? { maxCourses: data.maxCourses } : {}),
        ...(data.maxDownloads !== undefined ? { maxDownloads: data.maxDownloads } : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata as any } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update subscription plan',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if plan has active subscriptions
    const activeSubscriptions = await prisma.userSubscription.count({
      where: {
        planId: id,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete plan with active subscriptions',
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const plan = await prisma.subscriptionPlan.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete subscription plan',
      },
      { status: 500 }
    );
  }
}
