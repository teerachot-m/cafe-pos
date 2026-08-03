import 'dotenv/config';
import { PrismaClient, Role, StockLogType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Cafe POS database...');

  // 1. Users & Admin RBAC
  const defaultPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cafe.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@cafe.com',
      password: defaultPassword,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@cafe.com' },
    update: {},
    create: {
      name: 'Store Manager',
      email: 'manager@cafe.com',
      password: defaultPassword,
      role: Role.MANAGER,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@cafe.com' },
    update: {},
    create: {
      name: 'Cashier Alice',
      email: 'cashier@cafe.com',
      password: defaultPassword,
      role: Role.CASHIER,
    },
  });

  const barista = await prisma.user.upsert({
    where: { email: 'barista@cafe.com' },
    update: {},
    create: {
      name: 'Barista Bob',
      email: 'barista@cafe.com',
      password: defaultPassword,
      role: Role.BARISTA,
    },
  });

  // 2. Sales Channels & GP
  const channelsData = [
    { name: 'Offline / Walk-in', gpPercent: 0.0 },
    { name: 'LINE MAN', gpPercent: 30.0 },
    { name: 'GrabFood', gpPercent: 30.0 },
    { name: 'ShopeeFood', gpPercent: 30.0 },
  ];

  const channels: Record<string, string> = {};
  for (const item of channelsData) {
    const channel = await prisma.salesChannel.upsert({
      where: { name: item.name },
      update: { gpPercent: item.gpPercent },
      create: item,
    });
    channels[item.name] = channel.id;
  }

  // 3. Categories
  const catCoffee = await prisma.category.create({
    data: { name: 'Coffee', description: 'Freshly brewed espresso drinks', displayOrder: 1 },
  });

  const catNonCoffee = await prisma.category.create({
    data: { name: 'Non-Coffee', description: 'Matcha, Tea, and Chocolate drinks', displayOrder: 2 },
  });

  const catBakery = await prisma.category.create({
    data: { name: 'Bakery & Pastry', description: 'Freshly baked croissants & treats', displayOrder: 3 },
  });

  // 4. Raw Ingredients (Stock Inventory)
  const coffeeBeans = await prisma.ingredient.create({
    data: {
      name: 'Espresso Coffee Beans',
      unit: 'g',
      currentStock: 5000,
      minStockAlert: 1000,
      costPerUnit: 0.8, // 0.8 THB per gram (800 THB/kg)
    },
  });

  const freshMilk = await prisma.ingredient.create({
    data: {
      name: 'Fresh Whole Milk',
      unit: 'ml',
      currentStock: 10000,
      minStockAlert: 2000,
      costPerUnit: 0.06, // 60 THB per 1000ml
    },
  });

  const oatMilk = await prisma.ingredient.create({
    data: {
      name: 'Barista Oat Milk',
      unit: 'ml',
      currentStock: 3000,
      minStockAlert: 500,
      costPerUnit: 0.12, // 120 THB per 1000ml
    },
  });

  const caramelSyrup = await prisma.ingredient.create({
    data: {
      name: 'Caramel Syrup',
      unit: 'ml',
      currentStock: 2000,
      minStockAlert: 400,
      costPerUnit: 0.15,
    },
  });

  const matchaPowder = await prisma.ingredient.create({
    data: {
      name: 'Uji Matcha Powder',
      unit: 'g',
      currentStock: 1000,
      minStockAlert: 200,
      costPerUnit: 1.5, // 1500 THB per kg
    },
  });

  const takeawayCup = await prisma.ingredient.create({
    data: {
      name: 'Takeaway Iced Cup & Lid',
      unit: 'pcs',
      currentStock: 500,
      minStockAlert: 100,
      costPerUnit: 3.5,
    },
  });

  const croissantDough = await prisma.ingredient.create({
    data: {
      name: 'Raw Croissant Dough',
      unit: 'pcs',
      currentStock: 100,
      minStockAlert: 20,
      costPerUnit: 25.0,
    },
  });

  // Create initial stock logs
  const ingredients = [coffeeBeans, freshMilk, oatMilk, caramelSyrup, matchaPowder, takeawayCup, croissantDough];
  for (const ing of ingredients) {
    await prisma.stockLog.create({
      data: {
        ingredientId: ing.id,
        changeAmount: ing.currentStock,
        resultingStock: ing.currentStock,
        type: StockLogType.RESTOCK,
        note: 'Initial inventory seed load',
        createdById: admin.id,
      },
    });
  }

  // 5. Products & Options & BOM
  // Product 1: Iced Americano
  const americano = await prisma.product.create({
    data: {
      name: 'Iced Americano',
      description: 'Double shot espresso over iced water',
      price: 75.0,
      categoryId: catCoffee.id,
      imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80',
    },
  });

  // Sweetness Group
  const sweetnessGroup = await prisma.productOptionGroup.create({
    data: {
      productId: americano.id,
      name: 'Sweetness Level',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      items: {
        create: [
          { name: '100% Normal Sweet', extraPrice: 0 },
          { name: '50% Less Sweet', extraPrice: 0 },
          { name: '0% No Sugar', extraPrice: 0 },
        ],
      },
    },
  });

  // BOM Recipes for Americano
  await prisma.recipeBOM.createMany({
    data: [
      { productId: americano.id, ingredientId: coffeeBeans.id, quantityRequired: 18.0 },
      { productId: americano.id, ingredientId: takeawayCup.id, quantityRequired: 1.0 },
    ],
  });

  // Product 2: Iced Latte
  const latte = await prisma.product.create({
    data: {
      name: 'Iced Latte',
      description: 'Rich espresso with creamy fresh milk',
      price: 85.0,
      categoryId: catCoffee.id,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=400&q=80',
    },
  });

  const milkOptionGroup = await prisma.productOptionGroup.create({
    data: {
      productId: latte.id,
      name: 'Milk Type',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      items: {
        create: [
          { name: 'Whole Milk', extraPrice: 0 },
          { name: 'Oat Milk (+20)', extraPrice: 20 },
        ],
      },
    },
  });

  await prisma.recipeBOM.createMany({
    data: [
      { productId: latte.id, ingredientId: coffeeBeans.id, quantityRequired: 18.0 },
      { productId: latte.id, ingredientId: freshMilk.id, quantityRequired: 150.0 },
      { productId: latte.id, ingredientId: takeawayCup.id, quantityRequired: 1.0 },
    ],
  });

  // Product 3: Iced Caramel Macchiato
  const caramelMacchiato = await prisma.product.create({
    data: {
      name: 'Iced Caramel Macchiato',
      description: 'Espresso, fresh milk, vanilla and rich caramel drizzle',
      price: 95.0,
      categoryId: catCoffee.id,
      imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=400&q=80',
    },
  });

  await prisma.recipeBOM.createMany({
    data: [
      { productId: caramelMacchiato.id, ingredientId: coffeeBeans.id, quantityRequired: 18.0 },
      { productId: caramelMacchiato.id, ingredientId: freshMilk.id, quantityRequired: 130.0 },
      { productId: caramelMacchiato.id, ingredientId: caramelSyrup.id, quantityRequired: 20.0 },
      { productId: caramelMacchiato.id, ingredientId: takeawayCup.id, quantityRequired: 1.0 },
    ],
  });

  // Product 4: Iced Matcha Latte
  const matchaLatte = await prisma.product.create({
    data: {
      name: 'Uji Iced Matcha Latte',
      description: 'Premium Japanese ceremonial grade matcha with milk',
      price: 90.0,
      categoryId: catNonCoffee.id,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80',
    },
  });

  await prisma.recipeBOM.createMany({
    data: [
      { productId: matchaLatte.id, ingredientId: matchaPowder.id, quantityRequired: 10.0 },
      { productId: matchaLatte.id, ingredientId: freshMilk.id, quantityRequired: 180.0 },
      { productId: matchaLatte.id, ingredientId: takeawayCup.id, quantityRequired: 1.0 },
    ],
  });

  // Product 5: Butter Croissant
  const croissant = await prisma.product.create({
    data: {
      name: 'French Butter Croissant',
      description: 'Flaky, buttery baked croissant',
      price: 65.0,
      categoryId: catBakery.id,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
    },
  });

  await prisma.recipeBOM.create({
    data: { productId: croissant.id, ingredientId: croissantDough.id, quantityRequired: 1.0 },
  });

  // 6. CRM Customers
  await prisma.customer.upsert({
    where: { phone: '0812345678' },
    update: {},
    create: {
      name: 'Somchai Prasert',
      phone: '0812345678',
      email: 'somchai@example.com',
      points: 45,
      totalSpent: 2250,
    },
  });

  await prisma.customer.upsert({
    where: { phone: '0898765432' },
    update: {},
    create: {
      name: 'Kanya Srisawat',
      phone: '0898765432',
      email: 'kanya@example.com',
      points: 110,
      totalSpent: 5500,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
