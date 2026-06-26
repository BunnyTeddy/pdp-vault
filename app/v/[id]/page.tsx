import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntry } from '@/lib/db';
import { getProofStatus } from '@/lib/vault';
import { beryxAddress, formatBytes, timeAgo } from '@/lib/links';
import Countdown from '@/components/Countdown';
import type { ProofStatus, VaultEntry } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // always read fresh proof state on load
// Re-validate no sooner than 10s to avoid hammering the RPC on rapid refreshes.
export const revalidate = 10;

interface Props {
  params: { id: string };
}

export default async function VerifyPage({ params }: Props) {
  const entry = await getEntry(params.id);
  if (!entry) notFound();

  let status: ProofStatus | null = null;
  let readError: string | null = null;
  try {
    status = await getProofStatus(entry);
  } catch (e) {
    readError = e instanceof Error ? e.message : 'Proof read failed.';
  }

  const overdue = status?.isOverdue ?? false;
  const healthy = status && !overdue && status.lastProven;

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        {/* Top nav */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
        >
          ← back to vault
        </Link>

        {/* Filename header */}
        <div className="mb-6">
          <h1 className="break-all text-2xl font-bold sm:text-3xl">{entry.filename}</h1>
          <p className="mt-1 text-sm text-white/40">
            {formatBytes(entry.size)} · uploaded {timeAgo(entry.createdAt)}
          </p>
        </div>

        {/* Proof status card — the hero */}
        <ProofCard status={status} overdue={overdue} healthy={!!healthy} readError={readError} />

        {/* On-chain details */}
        <section className="glass mt-6 rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
            On-chain details
          </h2>
          <dl className="space-y-2.5 font-mono text-xs">
            <Row label="piece CID">
              <span className="break-all">{entry.pieceCid}</span>
            </Row>
            <Row label="data set">
              <span>{entry.dataSetId}</span>
            </Row>
            <Row label="piece id">
              <span>{status?.pieceId ?? '—'}</span>
            </Row>
            <Row label="provider">
              <a
                href={beryxAddress(entry.providerAddress)}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline"
              >
                {shortAddr(entry.providerAddress)}
              </a>
            </Row>
          </dl>
        </section>

        {/* What this means */}
        <section className="glass mt-6 rounded-2xl p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
            What is a PDP proof?
          </h2>
          <p className="text-sm leading-relaxed text-white/60">
            Provable Data Possession is Filecoin&apos;s cryptographic guarantee that a
            storage provider still holds your exact bytes. The provider periodically
            publishes a proof on-chain; if they ever stop, the data set is flagged{' '}
            <span className="text-amber-300">overdue</span> within minutes — verifiable
            by <em>anyone</em>, with no trust in the uploader or this app.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            This page re-derives the proof state live from the Filecoin calibration RPC
            using only the piece CID and data set id — not a cached or mocked value.
          </p>
        </section>

        {/* Optional retrieval */}
        {status?.retrievalUrl && (
          <a
            href={status.retrievalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 block rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            ↓ Retrieve the original file
          </a>
        )}

        {entry.note && (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm italic text-white/60">
            “{entry.note}”
          </p>
        )}
      </div>
    </main>
  );
}

function ProofCard({
  status,
  overdue,
  healthy,
  readError,
}: {
  status: ProofStatus | null;
  overdue: boolean;
  healthy: boolean;
  readError: string | null;
}) {
  if (readError) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/60">
          !
        </div>
        <h2 className="text-lg font-semibold">Couldn&apos;t reach the proof endpoint</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
          The on-chain record still exists — try refreshing in a moment.
        </p>
        <p className="mx-auto mt-3 max-w-md break-all font-mono text-xs text-white/30">
          {readError}
        </p>
      </div>
    );
  }

  if (overdue) {
    return (
      <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/30 text-2xl text-amber-200">
          ⚠
        </div>
        <h2 className="text-xl font-bold text-amber-100">Proof overdue</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-amber-200/70">
          The storage provider has missed a proof window. This file&apos;s storage can
          no longer be guaranteed — the on-chain record shows it.
        </p>
        <ProofFacts status={status} overdue />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-green-500/30 bg-green-500/5 p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-300">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-green-100">
        {healthy ? 'Proof verified' : 'Registered on Filecoin'}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
        {healthy
          ? 'This file is provably still in storage — checked just now against the chain.'
          : 'The data set is live. The first proof window will open shortly.'}
      </p>
      <ProofFacts status={status} overdue={false} />
    </div>
  );
}

function ProofFacts({ status, overdue }: { status: ProofStatus | null; overdue: boolean }) {
  if (!status) return null;
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-wide text-white/40">Last proven</p>
        <p className="mt-1 text-sm font-medium">
          {overdue ? (
            <span className="text-amber-300">overdue</span>
          ) : status.lastProven ? (
            timeAgo(status.lastProven)
          ) : (
            <span className="text-white/40">awaiting first proof</span>
          )}
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-wide text-white/40">Next proof due</p>
        <p className="mt-1 text-sm font-medium">
          {overdue ? (
            <span className="text-amber-300">missed</span>
          ) : (
            <Countdown target={status.nextProofDue} />
          )}
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-20 shrink-0 text-white/40">{label}</dt>
      <dd className="min-w-0 flex-1 text-white/80">{children}</dd>
    </div>
  );
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

// Type-only re-export to keep VaultEntry import meaningful if extended later.
export type { VaultEntry };
