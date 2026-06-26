import UploadBox from '@/components/UploadBox';
import RecentVaults from '@/components/RecentVaults';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Powered by Filecoin PDP · calibration testnet
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            <span className="gradient-text">PDP Vault</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Upload a file and get a shareable link that proves — cryptographically,
            from the chain — that your file is still really stored on Filecoin.
          </p>
        </header>

        {/* Upload */}
        <UploadBox />

        {/* How it works */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: '1',
              t: 'Upload',
              d: 'Your file is committed to Filecoin warm storage. You get a piece CID + on-chain data set.',
            },
            {
              n: '2',
              t: 'Prove',
              d: 'Storage providers file Provable Data Possession proofs on-chain on a schedule.',
            },
            {
              n: '3',
              t: 'Verify',
              d: 'Anyone with the link re-checks the live proof state — last-proven time, next-due, overdue alerts.',
            },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mb-1 font-semibold">{s.t}</h3>
              <p className="text-sm text-white/55">{s.d}</p>
            </div>
          ))}
        </section>

        {/* Recent vaults */}
        <section className="mt-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recently proven</h2>
            <Link href="#what-is-pdp" className="text-sm text-brand hover:underline">
              what is PDP?
            </Link>
          </div>
          <RecentVaults />
        </section>

        {/* PDP explainer */}
        <section id="what-is-pdp" className="glass mt-16 scroll-mt-8 rounded-2xl p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
            What is PDP?
          </h2>
          <p className="text-sm leading-relaxed text-white/60">
            Provable Data Possession is Filecoin&apos;s on-chain proof that a storage
            provider still holds the exact bytes for a file. PDP Vault turns that
            proof into the product: every verify link re-checks live chain state,
            not a cached badge or a backend promise.
          </p>
        </section>

        <footer className="mt-20 border-t border-white/5 pt-6 text-center text-xs text-white/30">
          PDP Vault · FilecoinTLDR Builder Challenge Cycle 1 · built with the{' '}
          <a
            href="https://github.com/FilOzone/synapse-sdk"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/60"
          >
            Synapse SDK
          </a>
        </footer>
      </div>
    </main>
  );
}
