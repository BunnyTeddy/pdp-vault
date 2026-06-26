'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { VaultEntry } from '@/lib/types';

export default function RecentVaults() {
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);

  useEffect(() => {
    fetch('/api/recent')
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]));
  }, []);

  if (!entries) {
    return <p className="text-sm text-white/40">Loading…</p>;
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Nothing yet — be the first to store a file and prove it.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map((e) => (
        <Link
          key={e.id}
          href={`/v/${e.id}`}
          className="glass group flex min-w-0 items-center justify-between rounded-xl p-4 transition hover:bg-white/10"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{e.filename}</p>
            <p className="truncate font-mono text-xs text-white/40" title={e.pieceCid}>
              {shortCid(e.pieceCid)}
            </p>
          </div>
          <span className="ml-3 shrink-0 text-xs text-white/30 transition group-hover:text-brand">
            view →
          </span>
        </Link>
      ))}
    </div>
  );
}

function shortCid(cid: string): string {
  if (cid.length <= 24) return cid;
  return `${cid.slice(0, 14)}...${cid.slice(-10)}`;
}
