import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hekate/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

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
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      interval,
      intervalCount,
      trialDays,
      features,
      maxCourses,
      maxDownloads,
      metadata,
      isActive,
    } = body;

    const plan = await prisma.subscriptionPlan.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        interval,
        intervalCount,
        trialDays,
        features,
        maxCourses,
        maxDownloads,
        metadata,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
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