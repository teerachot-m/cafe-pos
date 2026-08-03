import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Admin/Manager access required.' }, { status: 403 });
    }

    // Fetch all completed / non-cancelled orders
    const orders = await prisma.order.findMany({
      where: { orderStatus: { not: 'CANCELLED' } },
      include: { channel: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    let grossSales = 0;
    let totalGpFees = 0;
    let totalPointDiscounts = 0;
    let netSales = 0;
    let totalCogs = 0;

    const channelMap = new Map<string, { channelName: string; count: number; gross: number; gpFee: number; net: number }>();

    for (const ord of orders) {
      grossSales += ord.subtotal;
      totalGpFees += ord.channelGpFee;
      totalPointDiscounts += ord.pointDiscount;
      netSales += ord.netTotal;
      totalCogs += ord.cogsTotal;

      const chName = ord.channel.name;
      const existing = channelMap.get(chName);
      if (existing) {
        existing.count += 1;
        existing.gross += ord.subtotal;
        existing.gpFee += ord.channelGpFee;
        existing.net += ord.netTotal - ord.channelGpFee;
      } else {
        channelMap.set(chName, {
          channelName: chName,
          count: 1,
          gross: ord.subtotal,
          gpFee: ord.channelGpFee,
          net: ord.netTotal - ord.channelGpFee,
        });
      }
    }

    const netProfit = Math.round((netSales - totalGpFees - totalCogs) * 100) / 100;

    return NextResponse.json({
      summary: {
        totalOrders: orders.length,
        grossSales: Math.round(grossSales * 100) / 100,
        totalGpFees: Math.round(totalGpFees * 100) / 100,
        totalPointDiscounts: Math.round(totalPointDiscounts * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        totalCogs: Math.round(totalCogs * 100) / 100,
        netProfit,
        grossProfitMargin: grossSales > 0 ? Math.round(((netSales - totalCogs) / grossSales) * 10000) / 100 : 0,
      },
      channelsBreakdown: Array.from(channelMap.values()),
      recentOrders: orders.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
