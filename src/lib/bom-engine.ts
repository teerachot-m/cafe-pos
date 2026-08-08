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
  if (deductions.length === 0) return;

  // One round trip to read all stocks, then one update per ingredient and a
  // single batched log insert — keeps the transaction fast on remote databases.
  const ingredients = await txPrisma.ingredient.findMany({
    where: { id: { in: deductions.map((d) => d.ingredientId) } },
  });
  const stockById = new Map(ingredients.map((i) => [i.id, i.currentStock]));

  const logs: {
    ingredientId: string;
    changeAmount: number;
    resultingStock: number;
    type: StockLogType;
    note: string;
    createdById: string;
  }[] = [];

  for (const d of deductions) {
    const currentStock = stockById.get(d.ingredientId);
    if (currentStock === undefined) continue;

    const newStock = Math.max(0, currentStock - d.quantityDeducted);

    await txPrisma.ingredient.update({
      where: { id: d.ingredientId },
      data: { currentStock: newStock },
    });

    logs.push({
      ingredientId: d.ingredientId,
      changeAmount: -d.quantityDeducted,
      resultingStock: newStock,
      type: StockLogType.SALE_DEDUCTION,
      note: `Automatic BOM deduction for Order ID #${orderId}`,
      createdById: cashierId,
    });
  }

  if (logs.length > 0) {
    await txPrisma.stockLog.createMany({ data: logs });
  }
}
