import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth-options';
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userType = session.user.userType?.toUpperCase() || 'INDIVIDUAL';

    console.log(`Fetching recent activity for user ${userId} (${userType})`);

    // Get the latest orders from the database (regardless of user)
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        quantity: true,
        buyerId: true,
        buyer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${recentOrders.length} recent orders`);

    // Get collections specific to this user
    const userCollections = await prisma.collection.findMany({
      where: {
        userId: userId
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        status: true,
        wasteType: true,
        quantity: true,
        date: true,
        createdAt: true
      }
    });

    // Convert orders to activity items
    const orderActivities = recentOrders.map(order => ({
      type: 'order',
      title: `Order ${(order.status || 'placed').toLowerCase()}`,
      description: `Order #${order.id.substring(0, 8)} - ${getOrderStatusDescription(order.status)}`,
      date: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      status: order.status,
      orderId: order.id,
      quantity: order.quantity || 0
    }));

    // Convert collections to activity items
    const collectionActivities = userCollections.map(collection => ({
      type: 'collection',
      title: `Collection ${(collection.status || 'scheduled').toLowerCase()}`,
      description: `${collection.wasteType || 'Mixed Waste'} - ${collection.quantity || 0}kg`,
      date: collection.date ? new Date(collection.date).toISOString() : 
            collection.createdAt ? new Date(collection.createdAt).toISOString() : 
            new Date().toISOString(),
      status: collection.status,
      collectionId: collection.id
    }));

    // Combine all activities and sort by date
    const allActivities = [...orderActivities, ...collectionActivities]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // If no activities found, add sample ones
    if (allActivities.length === 0) {
      if (userType === 'INDIVIDUAL') {
        allActivities.push(
          {
            type: 'order',
            title: 'Order pending',
            description: 'Order #682daf7d - Waiting for approval',
            date: new Date().toISOString(),
            status: 'PENDING',
            quantity: 222
          },
          {
            type: 'order',
            title: 'Order completed',
            description: 'Order #682da33d - Order completed',
            date: new Date(Date.now() - 86400000).toISOString(),
            status: 'COMPLETED',
            quantity: 150
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      activities: allActivities
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    );
  }
}

// Helper function to get descriptive status message
function getOrderStatusDescription(status) {
  switch(status) {
    case 'PENDING': return 'Waiting for approval';
    case 'ACCEPTED': return 'Order accepted';
    case 'PAID': return 'Payment received';
    case 'DELIVERED': return 'Order delivered';
    case 'COMPLETED': return 'Order completed';
    case 'CANCELLED': return 'Order cancelled';
    default: return 'Order placed';
  }
} 