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
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id } = params;

    const subscription = await prisma.userSubscription.findUnique({
      where: {
        id,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription not found',
        },
        { status: 404 }
      );
    }

    // Only allow users to see their own subscriptions unless they're admin
    if (subscription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription',
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
    
    if (!session?.user) {
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
    const { status, cancelAtPeriodEnd, cancelReason } = body;

    const subscription = await prisma.userSubscription.findUnique({
      where: {
        id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription not found',
        },
        { status: 404 }
      );
    }

    // Only allow users to modify their own subscriptions unless they're admin
    if (subscription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = cancelAtPeriodEnd;
      if (cancelAtPeriodEnd) {
        updateData.canceledAt = new Date();
      }
    }

    if (cancelReason) {
      updateData.cancelReason = cancelReason;
    }

    const updatedSubscription = await prisma.userSubscription.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        plan: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update subscription',
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
    
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id } = params;

    const subscription = await prisma.userSubscription.findUnique({
      where: {
        id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription not found',
        },
        { status: 404 }
      );
    }

    // Only allow users to cancel their own subscriptions unless they're admin
    if (subscription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Cancel subscription immediately
    const canceledSubscription = await prisma.userSubscription.update({
      where: {
        id,
      },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: canceledSubscription,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel subscription',
      },
      { status: 500 }
    );
  }
}