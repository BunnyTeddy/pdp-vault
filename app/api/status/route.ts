import { NextResponse } from 'next/server';
import { getEntry } from '@/lib/db';
import { getProofStatus } from '@/lib/vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // always re-read on-chain proof state

/**
 * GET /api/status?id=<vaultId>
 * Returns the *live* PDP proof status for a vault entry, read straight from the
 * Filecoin calibration RPC. No wallet required — this is a trustless read.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing ?id=' }, { status: 400 });
  }

  const entry = await getEntry(id);
  if (!entry) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  try {
    const status = await getProofStatus(entry);
    return NextResponse.json({ entry, status });
  } catch (err) {
    console.error('[status] failed:', err);
    const message = err instanceof Error ? err.message : 'Status read failed.';
    // Return the entry with an error flag so the page can degrade gracefully.
    return NextResponse.json(
      { entry, error: message },
      { status: 200 },
    );
  }
}
