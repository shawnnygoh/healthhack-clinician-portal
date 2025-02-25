import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getSession();
  
  if (!session?.user) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
  
  return NextResponse.json({
    isAuthenticated: true,
    user: session.user
  });
}