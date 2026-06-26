'use client';

import { useEffect, useState } from 'react';

/**
 * Live, ticking countdown to a target timestamp.
 * Re-renders every second; shows "--" if no target.
 */
export default function Countdown({ target }: { target: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!target) return <span className="text-white/40">unknown</span>;

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) {
    return <span className="text-amber-300">due now</span>;
  }

  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3_600_000) % 24;
  const d = Math.floor(diff / 86_400_000);

  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);

  return <span className="font-mono tabular-nums">{parts.join(' ')}</span>;
}
