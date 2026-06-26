# AI Build Log — PDP Vault

> How this project was ideated, scoped, and built with AI as the build partner, for the FilecoinTLDR Builder Challenge (Cycle 1). This supports the **"AI-guided build process" (10%)** judging criterion.

---

## 0. The setup

I started from a blank directory with ~24 hours to the deadline. The whole thing was driven from the terminal with **Claude Code** as the build partner, plus the **Loops House** hackathon tooling (the `loops` CLI) for ideation and the sponsor knowledge graph.

## 1. Orientation & constraints extraction

First move: read the hackathon skill the `loops` CLI installed. That gave me the **ground truth** for the event in one shot:

- **Sponsor:** FilecoinTLDR — $250 prize pool (1st $125 / 2nd $75 / 3rd $50, in USDFC)
- **Theme:** "Build Your First Filecoin App With AI" — Filecoin must be **part of the product experience, not hidden backend storage**.
- **Judging weights:** Meaningful Filecoin use **30%**, working demo quality **25%**, creativity **20%**, clarity/showcase **15%**, AI-guided process **10%**.
- **Hard requirement:** live demo link, repo, explanation of the Filecoin mechanic, AI build log, and a public X post tagging `@Filecoin` + `@FilecoinTLDR`.

The weights told me where to invest: the **two biggest criteria (55% combined)** reward a *real, working* Filecoin primitive, and explicitly **penalize "just another upload-a-file app."** That shaped everything.

## 2. Ideation with the AI mentor

I spent **1 credit** on the Loops House mentor (`loops hackathon ideate`) with a tightly-scoped prompt covering the time budget and all five judging criteria. It returned three grounded, distinct ideas (StorageTinder, PDP Vault, Pay-Per-View), each tied to a real Synapse SDK primitive (Warm Storage marketplace, PDPVerifier, Filecoin Pay).

I mapped them against the criteria and picked **PDP Vault** for the best risk/reward:
- The *entire product IS the Filecoin primitive* (PDP) → maxes the 30% criterion.
- "Upload → proof → share → anyone verifies" is a short, reliable flow → best shot at a *real* (not mocked) demo for the 25% criterion.
- A shareable trustless proof is memorable and easy to explain → helps 20% + 15%.

## 3. Grounding in the real SDK (instead of guessing)

The mentor flagged the riskiest assumption: *can I generate/verify real PDP proofs in 24h?* The sponsor's knowledge-graph query (`loops knowledge query`) was returning a platform "Forbidden" error, so I couldn't cite it.

Instead of guessing the API from memory (which would hallucinate), I **went to the source**:

1. Resolved the real package on npm: `@filoz/synapse-sdk@1.0.1` (the older `@filecoin/synapse-sdk` name is dead).
2. Downloaded the **published tarball** and read the compiled `.d.ts` type definitions and the **test files** — the tests are the most reliable source of real usage patterns.
3. Extracted the authoritative flow:
   - **Funding:** `claimTokens()` from `@filoz/synapse-core/utils/calibration` (one-call faucet for tFIL + tUSDFC) → `payments.deposit()` → `payments.approveService()`.
   - **Upload:** `Synapse.create({chain: calibration, account})` → `storage.createContext({withCDN, metadata})` → `context.upload(data)`.
   - **Verify:** `context.pieceStatus({pieceCid})` → returns `{dataSetLastProven, dataSetNextProofDue, isProofOverdue, retrievalUrl, pieceId}` — **real on-chain proof state**.
4. Read the chain definitions to get the calibration RPC, USDFC token address, and contract addresses.

Every API call in the app is one I confirmed against the SDK's own type signatures.

## 4. Architecture decision (user in the loop)

I used a structured prompt to get the user's call on the two genuinely open decisions:

- **Wallet model → Relayer.** One server-held funded wallet pays for uploads, so judges/visitors can try the demo without a wallet or testnet FIL. Chosen for the most reliable demo.
- **Deploy → Vercel.** Zero-config Next.js hosting, automatic HTTPS.

## 5. Build

Scaffolded a Next.js 14 App Router app and built the three flows, verifying with `tsc --noEmit` and `next build` at each step. The product is small by design — landing page, upload API, and the **verify page** (where I invested the polish, since that's what makes PDP *visible*).

## 6. Live debugging (the interesting part)

This is where "real Filecoin use" got proven — every failure was a genuine Filecoin/SDK constraint, not a contrived bug:

| # | Failure | Root cause | Fix |
|---|---|---|---|
| 1 | `ERR_PACKAGE_PATH_NOT_EXPORTED` under `tsx` | SDK is ESM-only; my scripts ran CJS | Made the project `"type": "module"`, renamed configs to `.cjs` |
| 2 | Faucet `429 Too Many Requests` | Calibration faucet is rate-limited | Added retry-with-backoff + smart "skip faucet if already funded" |
| 3 | `actor not found` on balance read | New wallet had no on-chain actor yet (Filecoin needs ≥1 tx to materialize an account) | Polled balance until funded; tolerated the pre-funding error |
| 4 | `setup:relayer` ignored saved key | `tsx` doesn't auto-load `.env` (Next does) | Used Node 25's native `--env-file` flag |
| 5 | `Insufficient USDFC: have 5, need 50` | Faucet dispenses ~5 USDFC/claim; I tried to deposit 50 | Lowered deposit to 4 USDFC (plenty for demo — rates are fractions of a cent/epoch) |
| 6 | Upload: `85 bytes below minimum 127` | **Real Filecoin constraint:** PDP minimum piece size is 127 bytes | Pad sub-127-byte files with NUL bytes to the floor |
| 7 | Reads: `Transport must be a custom transport` | Bare address (not an account) broke viem's transport wiring | Used a real account for the reader |
| 8 | Reads: `actor not found` for throwaway reader | On Filecoin, even `eth_call`'s `from` must resolve to a funded actor | Reused the funded relayer account for reads (still trustless — reads are public view calls returning objective state) |

**The end result is genuinely real:** the verify page shows `lastProven`, a live countdown to `nextProofDue`, and an overdue alert — all read straight from the PDP verifier contract on calibration, re-derivable by anyone with the `pieceCID`.

## 7. Verification

End-to-end smoke test on calibration testnet passed:
- Uploaded a 174-byte file → got real `pieceCID` + `dataSetId 14835` + `providerId 2`.
- Verify page rendered **"Proof verified"**, last-proven timestamp, live countdown, and the provider's real retrieval URL — all from `context.pieceStatus()`.

## 8. What I'd do with more time
- Per-user self-custodial uploads (bring-your-own-wallet toggle) alongside the relayer.
- A "watch" mode that pings the RPC on an interval and flips the badge to overdue live.
- Mainnet deployment with real FIL.
