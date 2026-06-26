import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/vault';

export const runtime = 'nodejs';
// Relayer-funded uploads can take a while (approval + storage tx). Give it room.
export const maxDuration = 300;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB — keeps demo uploads snappy & cheap.

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = form.get('file');
  const note = (form.get('note') as string | null) ?? undefined;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_BYTES} bytes for this demo.` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const entry = await uploadFile(bytes, { filename: file.name, note });
    const base = requestBase(request);
    return NextResponse.json(
      {
        id: entry.id,
        url: `${base}/v/${entry.id}`,
        pieceCid: entry.pieceCid,
        dataSetId: entry.dataSetId,
        providerId: entry.providerId,
        size: entry.size,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[upload] failed:', err);
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function requestBase(request: Request): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return '';
}
