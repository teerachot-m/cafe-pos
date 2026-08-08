import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { syncMenuFromBom } from './new-bom';

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

  await prisma.user.upsert({
    where: { email: 'admin@cafe.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@cafe.com',
      password: defaultPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@cafe.com' },
    update: {},
    create: {
      name: 'Store Manager',
      email: 'manager@cafe.com',
      password: defaultPassword,
      role: Role.MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@cafe.com' },
    update: {},
    create: {
      name: 'Cashier Alice',
      email: 'cashier@cafe.com',
      password: defaultPassword,
      role: Role.CASHIER,
    },
  });

  await prisma.user.upsert({
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

  for (const item of channelsData) {
    await prisma.salesChannel.upsert({
      where: { name: item.name },
      update: { gpPercent: item.gpPercent },
      create: item,
    });
  }

  // 3. Menu, Ingredients & BOM recipes from NEW_BOM.xlsx (single source of truth)
  await syncMenuFromBom(prisma);

  // 4. CRM Customers
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
