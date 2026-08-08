import type { PrismaClient } from '@prisma/client';

// Menu & BOM data imported from NEW_BOM.xlsx (sheet "สูตรและMenu").
// Quantities are per one cup. Prices: storefront (หน้าร้าน) + LINE delivery price.

export interface BomIngredient {
  name: string;
  unit: string; // g | ml
  costPerUnit: number; // THB per unit
}

export interface BomMenu {
  name: string;
  category: 'Coffee' | 'Non-Coffee';
  price: number; // หน้าร้าน
  linePrice: number; // LINE delivery channel
  recipe: Record<string, number>; // ingredient name -> quantity per cup
}

export const BOM_INGREDIENTS: BomIngredient[] = [
  { name: 'Coffee HB', unit: 'g', costPerUnit: 0.5 },
  { name: 'Coffee / กาแฟ', unit: 'g', costPerUnit: 0.65 },
  { name: 'Thai tea / ชาไทย', unit: 'g', costPerUnit: 0.25 },
  { name: 'Uji Matcha / ผงมัทฉะ', unit: 'g', costPerUnit: 5.0 },
  { name: 'Matcha / ผงมัทฉะ', unit: 'g', costPerUnit: 1.5 },
  { name: 'Coconut / น้ำมะพร้าว', unit: 'ml', costPerUnit: 0.068 },
  { name: 'Orange / น้ำส้ม', unit: 'ml', costPerUnit: 0.055 },
  { name: 'Honey / น้ำผึ้ง', unit: 'g', costPerUnit: 0.25 },
  { name: 'Lemon / น้ำมะนาว', unit: 'g', costPerUnit: 0.1 },
  { name: 'Milk / นมจืด', unit: 'ml', costPerUnit: 0.045 },
  { name: 'น้ำเปล่า', unit: 'ml', costPerUnit: 0 },
  { name: 'น้ำร้อน', unit: 'ml', costPerUnit: 0 },
  { name: 'นมข้นหวาน', unit: 'g', costPerUnit: 0.066 },
  { name: 'นมข้นจืด', unit: 'ml', costPerUnit: 0.094 },
  { name: 'ผงโกโก้', unit: 'g', costPerUnit: 0.35 },
  { name: 'ผงไมโล', unit: 'g', costPerUnit: 0.2 },
  { name: 'วิปครีม', unit: 'g', costPerUnit: 0.12 },
  { name: 'สละไซรัป', unit: 'g', costPerUnit: 0.102 },
  { name: 'โซดา', unit: 'ml', costPerUnit: 0.031 },
];

export const BOM_MENUS: BomMenu[] = [
  {
    name: 'Americano', category: 'Coffee', price: 60, linePrice: 65,
    recipe: { 'Coffee / กาแฟ': 19, 'น้ำเปล่า': 125 },
  },
  {
    name: 'Americano Orange', category: 'Coffee', price: 85, linePrice: 90,
    recipe: { 'Coffee / กาแฟ': 19, 'Orange / น้ำส้ม': 150 },
  },
  {
    name: 'Americano Coconut', category: 'Coffee', price: 85, linePrice: 90,
    recipe: { 'Coffee / กาแฟ': 19, 'Coconut / น้ำมะพร้าว': 150 },
  },
  {
    name: 'Americano Honey Lemon', category: 'Coffee', price: 85, linePrice: 90,
    recipe: { 'Coffee / กาแฟ': 19, 'Honey / น้ำผึ้ง': 30, 'Lemon / น้ำมะนาว': 10, 'น้ำร้อน': 125 },
  },
  {
    name: 'Latte', category: 'Coffee', price: 80, linePrice: 85,
    recipe: { 'Coffee HB': 19, 'Milk / นมจืด': 125 },
  },
  {
    name: 'Cappucino', category: 'Coffee', price: 80, linePrice: 85,
    recipe: { 'Coffee HB': 19, 'Milk / นมจืด': 200, 'น้ำร้อน': 75, 'นมข้นหวาน': 30 },
  },
  {
    name: 'Mocha', category: 'Coffee', price: 85, linePrice: 90,
    recipe: { 'Coffee HB': 19, 'Milk / นมจืด': 200, 'น้ำร้อน': 100, 'นมข้นหวาน': 30, 'ผงโกโก้': 10 },
  },
  {
    name: 'Cocoa', category: 'Non-Coffee', price: 65, linePrice: 70,
    recipe: { 'Milk / นมจืด': 200, 'น้ำร้อน': 75, 'นมข้นหวาน': 30, 'ผงโกโก้': 15 },
  },
  {
    name: 'Milo', category: 'Non-Coffee', price: 60, linePrice: 65,
    recipe: { 'Milk / นมจืด': 175, 'น้ำร้อน': 75, 'ผงไมโล': 20 },
  },
  {
    name: 'Thai tea', category: 'Non-Coffee', price: 70, linePrice: 75,
    recipe: { 'Thai tea / ชาไทย': 14, 'Milk / นมจืด': 150, 'นมข้นหวาน': 30, 'นมข้นจืด': 50 },
  },
  {
    name: 'Pure Matcha', category: 'Non-Coffee', price: 65, linePrice: 70,
    recipe: { 'Uji Matcha / ผงมัทฉะ': 2, 'น้ำเปล่า': 100, 'น้ำร้อน': 50 },
  },
  {
    name: 'Matcha Latte', category: 'Non-Coffee', price: 75, linePrice: 80,
    recipe: { 'Matcha / ผงมัทฉะ': 4, 'Milk / นมจืด': 75, 'น้ำร้อน': 50, 'นมข้นจืด': 25, 'วิปครีม': 25 },
  },
  {
    name: 'Pink Milk', category: 'Non-Coffee', price: 60, linePrice: 65,
    recipe: { 'Milk / นมจืด': 200, 'น้ำร้อน': 100, 'วิปครีม': 10, 'สละไซรัป': 20 },
  },
  {
    name: 'Coconut Pink Milk', category: 'Non-Coffee', price: 75, linePrice: 80,
    recipe: { 'Coconut / น้ำมะพร้าว': 125, 'Milk / นมจืด': 30, 'วิปครีม': 20, 'สละไซรัป': 10 },
  },
  {
    name: 'Coconut Matcha', category: 'Non-Coffee', price: 85, linePrice: 90,
    recipe: { 'Uji Matcha / ผงมัทฉะ': 2, 'Coconut / น้ำมะพร้าว': 125, 'Milk / นมจืด': 30, 'วิปครีม': 20 },
  },
  {
    name: 'Coconut Thai tea', category: 'Non-Coffee', price: 75, linePrice: 80,
    recipe: { 'Thai tea / ชาไทย': 1, 'Coconut / น้ำมะพร้าว': 125, 'Milk / นมจืด': 30, 'วิปครีม': 20 },
  },
  {
    name: 'Coconut Cocoa', category: 'Non-Coffee', price: 75, linePrice: 80,
    recipe: { 'Coconut / น้ำมะพร้าว': 125, 'Milk / นมจืด': 30, 'น้ำร้อน': 10, 'ผงโกโก้': 10, 'วิปครีม': 20 },
  },
  {
    name: 'Honey Lemon Soda', category: 'Non-Coffee', price: 65, linePrice: 70,
    recipe: { 'Honey / น้ำผึ้ง': 30, 'Lemon / น้ำมะนาว': 10, 'น้ำร้อน': 75, 'โซดา': 175 },
  },
  {
    name: 'Red Lemon Soda', category: 'Non-Coffee', price: 60, linePrice: 65,
    recipe: { 'Lemon / น้ำมะนาว': 10, 'น้ำร้อน': 75, 'สละไซรัป': 20, 'โซดา': 175 },
  },
];

/**
 * Syncs the database's menu, ingredients and BOM recipes to NEW_BOM.xlsx.
 * Idempotent: safe to run repeatedly. Products not in the sheet are deleted
 * (or disabled when order history references them).
 */
export async function syncMenuFromBom(prisma: PrismaClient) {
  // 1. Categories
  const categoryIds: Record<string, string> = {};
  for (const catName of ['Coffee', 'Non-Coffee']) {
    let cat = await prisma.category.findFirst({ where: { name: catName } });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: catName, displayOrder: catName === 'Coffee' ? 1 : 2 },
      });
    }
    categoryIds[catName] = cat.id;
  }

  // 2. Ingredients (update cost/unit, keep current stock)
  const ingredientIds: Record<string, string> = {};
  for (const ing of BOM_INGREDIENTS) {
    const existing = await prisma.ingredient.findFirst({ where: { name: ing.name } });
    if (existing) {
      const updated = await prisma.ingredient.update({
        where: { id: existing.id },
        data: { unit: ing.unit, costPerUnit: ing.costPerUnit },
      });
      ingredientIds[ing.name] = updated.id;
    } else {
      const created = await prisma.ingredient.create({
        data: { name: ing.name, unit: ing.unit, costPerUnit: ing.costPerUnit, currentStock: 0 },
      });
      ingredientIds[ing.name] = created.id;
    }
  }

  // 3. LINE delivery channel for channel-specific prices.
  // NOTE: must match "LINE MAN" exactly-ish — a bare contains('LINE') also matches "Offline / Walk-in".
  const lineChannel = await prisma.salesChannel.findFirst({
    where: { name: { contains: 'LINE MAN', mode: 'insensitive' } },
  });

  // 4. Products + recipes + channel prices
  const menuNames = BOM_MENUS.map((m) => m.name);

  // Clear channel prices that earlier runs may have attached to the wrong channel
  if (lineChannel) {
    await prisma.productChannelPrice.deleteMany({
      where: { channelId: { not: lineChannel.id } },
    });
  }

  for (const menu of BOM_MENUS) {
    let product = await prisma.product.findFirst({ where: { name: menu.name } });
    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { price: menu.price, categoryId: categoryIds[menu.category], isAvailable: true },
      });
    } else {
      product = await prisma.product.create({
        data: { name: menu.name, price: menu.price, categoryId: categoryIds[menu.category] },
      });
    }

    // Replace BOM recipes with the sheet's formula
    await prisma.recipeBOM.deleteMany({ where: { productId: product.id } });
    await prisma.recipeBOM.createMany({
      data: Object.entries(menu.recipe).map(([ingName, qty]) => ({
        productId: product!.id,
        ingredientId: ingredientIds[ingName],
        quantityRequired: qty,
      })),
    });

    // LINE channel price
    if (lineChannel) {
      await prisma.productChannelPrice.upsert({
        where: { productId_channelId: { productId: product.id, channelId: lineChannel.id } },
        update: { price: menu.linePrice },
        create: { productId: product.id, channelId: lineChannel.id, price: menu.linePrice },
      });
    }
  }

  // 5. Remove products that are not in the sheet (disable when order history exists)
  const obsolete = await prisma.product.findMany({ where: { name: { notIn: menuNames } } });
  for (const p of obsolete) {
    try {
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`Deleted obsolete product: ${p.name}`);
    } catch {
      await prisma.product.update({ where: { id: p.id }, data: { isAvailable: false } });
      console.log(`Disabled obsolete product (has order history): ${p.name}`);
    }
  }

  // 6. Remove empty duplicate categories (safe: cascade only matters when products exist)
  const allCategories = await prisma.category.findMany({ include: { _count: { select: { products: true } } } });
  for (const cat of allCategories) {
    if (cat._count.products === 0) {
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`Deleted empty category: ${cat.name}`);
    }
  }

  // 7. Remove ingredients that are no longer used by any recipe in the sheet
  //    (kept when order snapshots / history still reference them)
  const ingNames = BOM_INGREDIENTS.map((i) => i.name);
  const obsoleteIngs = await prisma.ingredient.findMany({ where: { name: { notIn: ingNames } } });
  for (const ing of obsoleteIngs) {
    try {
      await prisma.ingredient.delete({ where: { id: ing.id } });
      console.log(`Deleted obsolete ingredient: ${ing.name}`);
    } catch {
      console.log(`Kept obsolete ingredient (referenced by order history): ${ing.name}`);
    }
  }

  console.log(`Menu sync complete: ${BOM_MENUS.length} menus, ${BOM_INGREDIENTS.length} ingredients.`);
}
