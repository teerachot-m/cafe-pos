import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { StockLogType } from '@prisma/client';

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      include: {
        stockLogs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(ingredients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, unit, currentStock, minStockAlert, costPerUnit } = await req.json();

    if (!name || !unit) {
      return NextResponse.json({ error: 'Name and unit required' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        minStockAlert: minStockAlert ? parseFloat(minStockAlert) : 10,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : 0,
      },
    });

    if (ingredient.currentStock > 0) {
      await prisma.stockLog.create({
        data: {
          ingredientId: ingredient.id,
          changeAmount: ingredient.currentStock,
          resultingStock: ingredient.currentStock,
          type: StockLogType.RESTOCK,
          note: 'Initial raw ingredient creation',
          createdById: session.id,
        },
      });
    }

    return NextResponse.json(ingredient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
