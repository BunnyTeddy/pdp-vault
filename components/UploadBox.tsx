'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';

interface UploadResult {
  id: string;
  url: string;
  pieceCid: string;
  dataSetId: string;
  providerId: string;
  size: number;
}

export default function UploadBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const upload = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed.');
      setResult(json as UploadResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload],
  );

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {!busy && !result && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition ${
            dragOver
              ? 'border-brand bg-brand/10'
              : 'border-white/15 hover:border-white/30 hover:bg-white/5'
          }`}
        >
          <UploadIcon />
          <span className="mt-4 font-medium">Drop a file or click to upload</span>
          <span className="mt-1 text-xs text-white/40">
            Any file · up to 2 MiB · stored on Filecoin calibration testnet
          </span>
        </button>
      )}

      {busy && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner />
          <p className="mt-4 text-sm text-white/60">
            Committing to Filecoin… this confirms an on-chain storage transaction.
          </p>
          <p className="mt-1 text-xs text-white/30">Usually 15–45 seconds.</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {result && !busy && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-300">
            <CheckIcon />
          </div>
          <h3 className="text-lg font-semibold">Stored & provable</h3>
          <p className="mt-1 max-w-md text-sm text-white/50">
            Your file is now on Filecoin with a live PDP data set. Share the link —
            anyone can verify the proof independently.
          </p>
          <div className="mt-4 w-full max-w-md rounded-xl border border-white/10 bg-black/30 p-3 text-left font-mono text-xs">
            <div className="truncate" title={result.url}>
              <span className="text-white/40">verifyURL </span>
              {result.url}
            </div>
            <div className="truncate">
              <span className="text-white/40">pieceCID </span>
              {result.pieceCid}
            </div>
            <div className="mt-1 truncate">
              <span className="text-white/40">dataSet </span>
              {result.dataSetId}
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Link
              href={`/v/${result.id}`}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              View proof →
            </Link>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(result.url);
                setCopied(true);
              }}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setCopied(false);
              }}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-brand">
      <path
        d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
