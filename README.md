# 🔐 PDP Vault

> **Prove you didn't lose my file.**
> Upload a file and get a shareable link that shows — cryptographically, from the Filecoin chain — that your file is still really stored. Not a mockup. Not "trust us." Real on-chain **Provable Data Possession (PDP)** proof, re-checked live every time someone opens the link.

Built for the **FilecoinTLDR Builder Challenge — Cycle 1**.

🌐 **Live demo:** _(add Vercel URL after deploy)_
📦 **Repo:** _(add GitHub URL)_

---

## The one-mechanic pitch

Every other "Filecoin app" hides storage in the backend. **PDP Vault makes the proof the product.**

1. **Upload** a file. It's committed to Filecoin warm storage — you get a `pieceCID` and an on-chain **data set**.
2. **Prove.** The storage provider periodically files a PDP proof on-chain proving they still hold your exact bytes.
3. **Verify.** Anyone with your link opens a page that *re-derives the proof state live from the Filecoin RPC* — last-proven time, a ticking countdown to the next proof, and a red **⚠️ OVERDUE** alert if a proof is ever missed.

The verify page reads objective on-chain state using only the `pieceCID` + `dataSetId` + `providerId` triple — **the uploader and this server cannot fake it.** If the provider stops proving, the page says so within minutes.

### Why this isn't "another upload app"
The upload is the boring part. The product is the **trustless, shareable proof of ongoing storage** — something you'd actually send to a client, an auditor, or a judge.

---

## How it uses the Filecoin stack

| Primitive | Where it shows up |
|---|---|
| **PDP (Provable Data Possession)** | The entire verify page. `context.pieceStatus()` returns `lastProven`, `nextProofDue`, `isProofOverdue` straight from the PDP verifier contract. |
| **Warm Storage Service (FWSS)** | Files go to Filecoin *warm* storage (fast retrieval) via the Synapse SDK, not cold archive deals. |
| **Filecoin Pay (USDFC)** | The relayer wallet deposits USDFC and approves the service as operator; storage is paid per-epoch over Filecoin Pay rails. |
| **SP Registry** | The storage provider is resolved from the on-chain registry; the verify page links to its address on Beryx. |
| **CommP piece CID** | Content-addressed identifier for each uploaded file — the verify page surfaces it as the file's verifiable fingerprint. |

**Network:** Filecoin **calibration testnet** (chain id `314159`). All proof data is real, just on testnet FIL/USDFC.

---

## Architecture

```
Browser ──► Next.js (Vercel)
              │
              ├── POST /api/upload ─► Relayer wallet (server-held)
              │                          │
              │                          ├── Synapse SDK ──► FWSS + PDP provider (calibration)
              │                          └── pays via USDFC (Filecoin Pay)
              │
              ├── GET /v/[id] ─► reads live pieceStatus() from RPC (trustless)
              └── Vercel KV / local JSON — vault metadata (pieceCID, dataSetId, providerId)
```

- **Relayer model:** one server-held funded wallet pays for all uploads, so visitors don't need a wallet or testnet FIL to try it. Reads reuse the same on-chain account (required so the `eth_call` `from` resolves to a funded actor — a Filecoin quirk).
- **Persistence:** [Vercel KV](https://vercel.com/docs/storage/vercel-kv) in production; falls back to a local JSON file in dev. Either way we only store the *metadata needed to re-verify* — never the file bytes (those live on Filecoin).

---

## Run it locally

### Prerequisites
- Node.js 20+ (tested on 25)
- An internet connection (talks to the public calibration RPC)

### Steps
```bash
# 1. Install
npm install

# 2. Fund the relayer wallet (one-time)
#    Generates a key, claims calibration tFIL + tUSDFC from the faucet,
#    deposits USDFC into the payments contract, and approves the warm-storage service.
npm run setup:relayer

# 3. Run
npm run dev
# open http://localhost:3000
```

If the faucet is rate-limited, the script tells you — wait ~40s and re-run (it's idempotent; the key is saved in `.env`). You can also claim manually at <https://forest-explorer.chainsafe.dev/>.

### Env
See [`.env.example`](./.env.example). The only required var is `RELAYER_PRIVATE_KEY`, which `setup:relayer` creates for you.

---

## Project layout

```
app/
  page.tsx                 # landing + upload dropzone
  v/[id]/page.tsx          # ★ verify page (live PDP proof)
  api/upload/route.ts      # relayer-funded upload
  api/status/route.ts      # live pieceStatus read
  api/recent/route.ts      # recent vault entries
components/
  UploadBox.tsx            # dropzone + upload progress + result
  RecentVaults.tsx         # recent-proofs gallery
  Countdown.tsx            # ticking countdown to next proof
lib/
  synapse.ts               # Synapse SDK factory (relayer client)
  vault.ts                 # uploadFile() + getProofStatus()
  db.ts                    # KV / local-JSON persistence
  types.ts                 # VaultEntry, ProofStatus
  links.ts                 # Beryx explorer links + formatters
scripts/
  setup-relayer.ts         # one-time wallet funding
```

---

## Tech
- **[Next.js 14](https://nextjs.org/)** (App Router, server components) + TypeScript + Tailwind
- **[`@filoz/synapse-sdk`](https://github.com/FilOzone/synapse-sdk)** `1.0.1` — the official Filecoin Onchain Cloud SDK
- **[viem](https://viem.sh)** — Ethereum/Filecoin client
- **[Vercel KV](https://vercel.com/docs/storage/vercel-kv)** — serverless persistence

---

## AI-guided build

This project was built with **Claude Code** as the build partner. See [`BUILD_LOG.md`](./BUILD_LOG.md) for the full ideation → SDK source-mining → build → live-debug sequence.

Built for the FilecoinTLDR Builder Challenge · Cycle 1.
