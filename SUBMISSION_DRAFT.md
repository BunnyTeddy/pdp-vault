# Submission content — ready to paste into the Loops House web UI

> The `loops hackathon submit` CLI returns **Forbidden** for this account on all
> per-hackathon operations (submit, artifact, knowledge query), while global
> commands (credits, ideate, auth) work. The registration deadline was
> **Jun 19, 2026** — today is Jun 26. The most likely cause is that this account
> is **not registered** for the hackathon (registration is via the web UI, not
> the CLI). This file preserves the prepared submission so you can paste it into
> the web form at https://loopshouse.com once registered/signed in there.

---

**Project name:** PDP Vault

**Tagline:** Prove your file is really on Filecoin — shareable, trustless, live PDP proof.

**Live demo URL:** https://pdp-vault.vercel.app

**Repo URL:** https://github.com/BunnyTeddy/pdp-vault

**Production smoke proof:** https://pdp-vault.vercel.app/v/ln4c6flto6ap

**Pitch:**
Most "Filecoin apps" hide storage in the backend. PDP Vault makes the proof the product: upload a file, get a link, and anyone who opens it sees real on-chain Provable Data Possession proof (last-proven time, a ticking countdown, overdue alerts) that the file is still stored — re-derived live from the chain, not mocked.

**Description:**

## What it is

PDP Vault turns Filecoin's Provable Data Possession (PDP) into a shareable product. Upload a file and you get a link; anyone who opens it sees **live, on-chain proof** that the file is still really stored — a green "Proof verified" badge, the last-proven timestamp, a ticking countdown to the next proof, and a red "⚠️ Proof overdue" alert the moment a proof is ever missed.

## The one mechanic

The verify page is the product. It re-derives proof state straight from the Filecoin calibration RPC using only the pieceCID + dataSetId + providerId triple — the uploader and this server cannot fake it. If the storage provider stops proving, the page says so within minutes. This is categorically NOT "just another upload app": the upload is the boring part; the shareable, trustless proof of *ongoing* storage is the product.

## How it uses the Filecoin stack (meaningfully)

- **PDP (Provable Data Possession)** — the entire verify page. `context.pieceStatus()` returns `lastProven`, `nextProofDue`, `isProofOverdue` straight from the PDP verifier contract. This is the core primitive, fully visible.
- **Warm Storage Service (FWSS)** — files go to Filecoin *warm* storage (fast retrieval) via the Synapse SDK, not cold archive deals.
- **Filecoin Pay (USDFC)** — the relayer wallet deposits USDFC and approves the warm-storage service as an operator; storage is paid per-epoch over Filecoin Pay rails.
- **SP Registry** — the storage provider is resolved from the on-chain registry; the verify page links to its address on Beryx.
- **CommP piece CID** — surfaced as each file's verifiable content fingerprint.

Network: Filecoin **calibration testnet** (chain 314159). All proof data is real, on testnet funds.

## AI-guided build

Built with Claude Code as the build partner. The full ideation → SDK source-mining → live-debug sequence is documented in BUILD_LOG.md, including every real Filecoin/SDK constraint hit and fixed (ESM packaging, faucet rate-limits, the Filecoin "actor not found" funding quirk, the 127-byte PDP minimum piece size, and the funded-actor requirement for view calls).

## How to try it

Open the demo, drop any small file in, and you'll get a verify link showing a real pieceCID, data set, and live PDP proof. No wallet required — a server-held relayer wallet funds uploads on calibration.

---

## Fields to fill in on the web form once available
- **Live demo URL:** https://pdp-vault.vercel.app
- **Repo URL:** https://github.com/BunnyTeddy/pdp-vault
- **Production smoke proof:** https://pdp-vault.vercel.app/v/ln4c6flto6ap
- **X post link:** _(add after posting — see X_POST.md)_
- **AI build log:** https://github.com/BunnyTeddy/pdp-vault/blob/master/BUILD_LOG.md
