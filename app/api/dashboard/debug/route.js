import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userType = session.user.userType?.toUpperCase() || 'INDIVIDUAL';

    // Get basic user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        points: true
      }
    });

    // Get collections data
    const collections = await prisma.collection.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true,
        type: true,
        date: true,
        status: true,
        address: true,
        wasteType: true,
        quantity: true,
        createdAt: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 5
    });

    // Get orders data
    const orders = await prisma.order.findMany({
      where: {
        buyerId: userId
      },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Count orders
    const totalOrders = await prisma.order.count({
      where: { buyerId: userId }
    });

    // Create manual recent activity for testing
    const recentActivity = [
      {
        type: 'system',
        title: 'Debug Activity 1',
        description: 'This is a test activity for debugging',
        date: new Date().toISOString(),
        status: 'PENDING'
      },
      {
        type: 'system',
        title: 'Debug Activity 2',
        description: 'Another test activity for debugging',
        date: new Date(Date.now() - 3600000).toISOString(),
        status: 'COMPLETED'
      }
    ];

    return NextResponse.json({
      success: true,
      user,
      collections,
      orders,
      totalOrders,
      recentActivity,
      dashboardData: {
        collections,
        totalCollections: collections.length,
        points: user?.points || 0,
        totalOrders,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 