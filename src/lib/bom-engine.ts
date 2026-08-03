import { prisma } from './prisma';
import { StockLogType } from '@prisma/client';

export interface CartItemInput {
  productId: string;
  quantity: number;
  optionItemIds?: string[];
}

export interface BOMCalculationResult {
  cogsTotal: number;
  ingredientDeductions: {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    quantityDeducted: number;
    costPerUnit: number;
  }[];
}

/**
 * Calculates total raw ingredient requirements & COGS for a set of cart items.
 */
export async function calculateOrderBOM(items: CartItemInput[]): Promise<BOMCalculationResult> {
  const deductionMap = new Map<
    string,
    { ingredientId: string; ingredientName: string; unit: string; quantityDeducted: number; costPerUnit: number }
  >();

  let cogsTotal = 0;

  for (const item of items) {
    // 1. Fetch product BOM recipes
    const recipes = await prisma.recipeBOM.findMany({
      where: {
        productId: item.productId,
        OR: [
          { optionItemId: null },
          { optionItemId: { in: item.optionItemIds || [] } },
        ],
      },
      include: {
        ingredient: true,
      },
    });

    for (const recipe of recipes) {
      const ing = recipe.ingredient;
      const totalAmountUsed = recipe.quantityRequired * item.quantity;
      const totalIngredientCost = totalAmountUsed * ing.costPerUnit;

      cogsTotal += totalIngredientCost;

      const existing = deductionMap.get(ing.id);
      if (existing) {
        existing.quantityDeducted += totalAmountUsed;
      } else {
        deductionMap.set(ing.id, {
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.unit,
          quantityDeducted: totalAmountUsed,
          costPerUnit: ing.costPerUnit,
        });
      }
    }
  }

  return {
    cogsTotal: Math.round(cogsTotal * 100) / 100,
    ingredientDeductions: Array.from(deductionMap.values()),
  };
}

/**
 * Deducts stock from inventory and records logs & snapshots during order completion.
 */
export async function processBOMStockDeduction(
  orderId: string,
  deductions: { ingredientId: string; ingredientName: string; unit: string; quantityDeducted: number }[],
  cashierId: string,
  txPrisma = prisma
) {
  for (const d of deductions) {
    // Fetch current ingredient stock
    const ing = await txPrisma.ingredient.findUnique({
      where: { id: d.ingredientId },
    });

    if (!ing) continue;

    const newStock = Math.max(0, ing.currentStock - d.quantityDeducted);

    // Update ingredient stock
    await txPrisma.ingredient.update({
      where: { id: d.ingredientId },
      data: { currentStock: newStock },
    });

    // Create stock log entry
    await txPrisma.stockLog.create({
      data: {
        ingredientId: d.ingredientId,
        changeAmount: -d.quantityDeducted,
        resultingStock: newStock,
        type: StockLogType.SALE_DEDUCTION,
        note: `Automatic BOM deduction for Order ID #${orderId}`,
        createdById: cashierId,
      },
    });
  }
}
