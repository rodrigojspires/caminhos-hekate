import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hekate/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Only allow users to see their own subscriptions unless they're admin
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        userId,
      },
      include: {
        plan: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscriptions',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { planId, paymentProvider } = body;

    // Validate plan exists and is active
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or inactive subscription plan',
        },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an active subscription',
        },
        { status: 400 }
      );
    }

    // Calculate subscription dates
    const now = new Date();
    const trialEndDate = plan.trialDays && plan.trialDays > 0 
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;
    
    const currentPeriodStart = trialEndDate || now;
    const currentPeriodEnd = new Date(
      currentPeriodStart.getTime() + 
      (plan.interval === 'MONTHLY' ? 30 : 365) * plan.intervalCount * 24 * 60 * 60 * 1000
    );

    // Create subscription
    const subscription = await prisma.userSubscription.create({
      data: {
        userId: session.user.id,
        planId,
        status: trialEndDate ? 'TRIALING' : 'PENDING',
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: trialEndDate ? now : null,
        trialEnd: trialEndDate,
        metadata: {
          createdVia: 'api',
          userAgent: request.headers.get('user-agent'),
        },
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription',
      },
      { status: 500 }
    );
  }
}