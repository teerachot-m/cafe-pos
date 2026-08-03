import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const channels = await prisma.salesChannel.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(channels);
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

    const { name, gpPercent, active } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Channel name required' }, { status: 400 });
    }

    const channel = await prisma.salesChannel.create({
      data: {
        name,
        gpPercent: parseFloat(gpPercent || 0),
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(channel);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, gpPercent, active } = await req.json();

    const channel = await prisma.salesChannel.update({
      where: { id },
      data: {
        gpPercent: parseFloat(gpPercent),
        active,
      },
    });

    return NextResponse.json(channel);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
