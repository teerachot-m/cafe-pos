import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { StockLogType } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { amount, type, note, costPerUnit } = await req.json();

    const changeAmount = parseFloat(amount);
    if (isNaN(changeAmount) || changeAmount === 0) {
      return NextResponse.json({ error: 'Invalid change amount' }, { status: 400 });
    }

    const ing = await prisma.ingredient.findUnique({ where: { id } });
    if (!ing) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    let delta = changeAmount;
    if (type === 'WASTE' && delta > 0) delta = -delta;

    const newStock = Math.max(0, ing.currentStock + delta);

    const updatedIng = await prisma.ingredient.update({
      where: { id },
      data: {
        currentStock: newStock,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : ing.costPerUnit,
      },
    });

    await prisma.stockLog.create({
      data: {
        ingredientId: id,
        changeAmount: delta,
        resultingStock: newStock,
        type: (type as StockLogType) || StockLogType.RESTOCK,
        note: note || `Manual stock update (${type})`,
        createdById: session.id,
      },
    });

    return NextResponse.json(updatedIng);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
