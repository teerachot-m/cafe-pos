import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (phone) {
      const customer = await prisma.customer.findUnique({
        where: { phone },
        include: {
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { orderNo: true, netTotal: true, createdAt: true },
          },
        },
      });
      return NextResponse.json(customer);
    }

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, email } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone number required' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        points: 0,
        totalSpent: 0,
      },
    });

    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
