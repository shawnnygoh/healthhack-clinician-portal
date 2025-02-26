import { handleAuth } from '@auth0/nextjs-auth0';
import { type NextRequest } from 'next/server';

const auth0Handler = handleAuth();

export async function GET(req: NextRequest, ctx: { params: Promise<{ auth0: string }> }) {
  const params = await ctx.params;
  return auth0Handler(req, { params });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ auth0: string }> }) {
  const params = await ctx.params;
  return auth0Handler(req, { params });
}