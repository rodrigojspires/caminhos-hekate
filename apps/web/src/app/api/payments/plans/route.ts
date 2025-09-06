import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hekate/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        monthlyPrice: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plans',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      tier,
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
    } = body;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        tier,
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        interval: interval || 'MONTHLY',
        intervalCount: intervalCount || 1,
        trialDays: trialDays || 0,
        features,
        maxCourses,
        maxDownloads,
        metadata,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription plan',
      },
      { status: 500 }
    );
  }
}