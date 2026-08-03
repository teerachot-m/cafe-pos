import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
