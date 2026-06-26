import { NextResponse } from 'next/server';
import { listRecent } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/recent — most recent vault entries (for the landing gallery). */
export async function GET() {
  const entries = await listRecent(12);
  return NextResponse.json({ entries });
}
