import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calculateOrderBOM, processBOMStockDeduction } from '@/lib/bom-engine';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (status) {
      whereClause.orderStatus = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        channel: true,
        customer: true,
        cashier: { select: { name: true } },
        items: {
          include: {
            bomSnapshots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Cashier login required.' }, { status: 401 });
    }

    const {
      channelId,
      customerId,
      items,
      paymentMethod,
      usePoints,
      note,
    } = await req.json();

    if (!channelId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sales channel and order items required' }, { status: 400 });
    }

    // 1. Fetch channel GP
    const channel = await prisma.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // 2. Fetch Customer if provided & handle points logic
    let customer = null;
    let pointsToUse = 0;
    let pointDiscount = 0;

    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer && usePoints && usePoints > 0) {
        pointsToUse = Math.min(customer.points, parseInt(usePoints));
        pointDiscount = pointsToUse * 1.0; // 1 point = 1 THB discount
      }
    }

    // 3. Compute Cart Items Subtotal & Option Details
    let orderSubtotal = 0;
    const processedOrderItems: any[] = [];
    const bomInputItems: { productId: string; quantity: number; optionItemIds: string[] }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { optionGroups: { include: { items: true } } },
      });

      if (!product) {
        return NextResponse.json({ error: `Product ID ${item.productId} not found` }, { status: 400 });
      }

      let itemUnitPrice = product.price;
      const selectedOptionNames: string[] = [];
      const optionItemIds: string[] = [];

      if (item.optionItemIds && Array.isArray(item.optionItemIds)) {
        for (const optId of item.optionItemIds) {
          for (const group of product.optionGroups) {
            const matchOpt = group.items.find((o) => o.id === optId);
            if (matchOpt) {
              itemUnitPrice += matchOpt.extraPrice;
              selectedOptionNames.push(`${group.name}: ${matchOpt.name}`);
              optionItemIds.push(matchOpt.id);
            }
          }
        }
      }

      const itemSubtotal = itemUnitPrice * item.quantity;
      orderSubtotal += itemSubtotal;

      processedOrderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice: itemUnitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        selectedOptionsJson: JSON.stringify(selectedOptionNames),
        optionItemIds,
      });

      bomInputItems.push({
        productId: product.id,
        quantity: item.quantity,
        optionItemIds,
      });
    }

    // 4. Calculate Net Total & GP Fee & Points Earned
    const netTotal = Math.max(0, orderSubtotal - pointDiscount);
    const channelGpPercent = channel.gpPercent;
    const channelGpFee = Math.round((orderSubtotal * (channelGpPercent / 100)) * 100) / 100;

    // 1 point earned per 50 THB net spent
    const pointsEarned = Math.floor(netTotal / 50);

    // 5. Calculate BOM & COGS
    const bomResult = await calculateOrderBOM(bomInputItems);

    // 6. Generate Unique Order Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `ORD-${dateStr}-${randomSuffix}`;

    // 7. Perform DB Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          orderNo,
          channelId: channel.id,
          customerId: customer ? customer.id : null,
          cashierId: session.id,
          subtotal: orderSubtotal,
          channelGpPercent,
          channelGpFee,
          netTotal,
          cogsTotal: bomResult.cogsTotal,
          pointsEarned: customer ? pointsEarned : 0,
          pointsUsed: pointsToUse,
          pointDiscount,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PREPARING,
          note: note || null,
        },
      });

      // Create Order Items & Snapshots
      for (const pItem of processedOrderItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: pItem.productId,
            productName: pItem.productName,
            unitPrice: pItem.unitPrice,
            quantity: pItem.quantity,
            subtotal: pItem.subtotal,
            selectedOptionsJson: pItem.selectedOptionsJson,
          },
        });

        // Add BOM Snapshots for this order item
        const itemBOMs = bomResult.ingredientDeductions;
        for (const ingDec of itemBOMs) {
          await tx.orderItemBOMSnapshot.create({
            data: {
              orderItemId: orderItem.id,
              ingredientId: ingDec.ingredientId,
              ingredientName: ingDec.ingredientName,
              quantityDeducted: ingDec.quantityDeducted,
              unit: ingDec.unit,
            },
          });
        }
      }

      // Process BOM Stock Deductions
      await processBOMStockDeduction(order.id, bomResult.ingredientDeductions, session.id, tx as any);

      // Update Customer CRM Points if linked
      if (customer) {
        const newPointBalance = customer.points - pointsToUse + pointsEarned;
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            points: Math.max(0, newPointBalance),
            totalSpent: customer.totalSpent + netTotal,
          },
        });
      }

      return order;
    });

    const fullOrderDetails = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: {
        channel: true,
        customer: true,
        cashier: { select: { name: true } },
        items: true,
      },
    });

    return NextResponse.json(fullOrderDetails);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
