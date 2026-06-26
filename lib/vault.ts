import type { PieceCID } from '@filoz/synapse-sdk';
import { getReaderSynapse, getRelayerSynapse } from './synapse';
import { saveEntry } from './db';
import type { ProofStatus, VaultEntry } from './types';

/**
 * Upload a file's bytes to Filecoin via the relayer wallet, persist a vault
 * entry, and return the shareable record.
 *
 * Flow (verified against @filoz/synapse-sdk@1.0.1 types + tests):
 *   storage.createContext({ withCDN, metadata })
 *     -> context.upload(data, { onPiecesConfirmed })
 *     -> { pieceCid, size, copies: [{ pieceId, dataSetId, providerId, retrievalUrl }] }
 *
 * `withCDN` keeps retrieval fast for the verify page's download link.
 */
export async function uploadFile(
  data: Uint8Array,
  meta: { filename: string; note?: string },
): Promise<VaultEntry> {
  const synapse = await getRelayerSynapse();

  // Filecoin PDP requires a minimum piece size (127 bytes). Pad tiny files with
  // NUL bytes to the floor so small uploads still work — the original content is
  // preserved at the front; retrieval still returns the real bytes.
  const MIN_PDP_BYTES = 127;
  let uploadData = data;
  if (data.byteLength < MIN_PDP_BYTES) {
    uploadData = new Uint8Array(MIN_PDP_BYTES);
    uploadData.set(data);
    // remainder left as zero bytes (padding)
  }

  // One storage context per upload. The SDK selects an approved PDP provider
  // and reuses/creates a data set under the relayer account automatically.
  const context = await synapse.storage.createContext({
    withCDN: true,
    metadata: { app: 'pdp-vault', filename: meta.filename },
  });

  const result = await context.upload(uploadData, {
    onPiecesConfirmed: (dataSetId, providerId, pieces) => {
      // Informational callback — proof of on-chain confirmation.
      console.log(
        `[pdp-vault] pieces confirmed: dataSet=${dataSetId} provider=${providerId} cids=${pieces
          .map((p) => p.pieceCid.toString())
          .join(',')}`,
      );
    },
  });

  const copy = result.copies[0];
  if (!copy) {
    throw new Error('Upload completed but no storage copy was returned.');
  }

  const provider = await context.getProviderInfo();

  const entry: VaultEntry = {
    id: makeId(),
    pieceCid: result.pieceCid.toString(),
    dataSetId: String(copy.dataSetId),
    providerId: String(copy.providerId),
    providerAddress: provider.serviceProvider,
    serviceURL: provider.pdp?.serviceURL ?? '',
    size: result.size,
    filename: meta.filename,
    note: meta.note,
    createdAt: new Date().toISOString(),
    withCDN: context.withCDN,
  };

  await saveEntry(entry);
  return entry;
}

/**
 * Read the *current* on-chain PDP proof status for a vault entry.
 *
 * This is the trustless core of the verify page: it re-derives proof state from
 * the public RPC using only the (pieceCid, dataSetId, providerId) tuple — no
 * relayer wallet, no trust in the uploader. Anyone can run this.
 *
 * Flow:
 *   reader.storage.createContext({ providerId, dataSetId })
 *     -> context.pieceStatus({ pieceCid })
 *     -> { dataSetLastProven, dataSetNextProofDue, isProofOverdue,
 *          inChallengeWindow, hoursUntilChallengeWindow, retrievalUrl, pieceId }
 */
export async function getProofStatus(
  entry: VaultEntry,
): Promise<ProofStatus> {
  const synapse = await getReaderSynapse();

  const context = await synapse.storage.createContext({
    withCDN: entry.withCDN,
    providerId: BigInt(entry.providerId),
    dataSetId: BigInt(entry.dataSetId),
  });

  const status = await context.pieceStatus({
    pieceCid: entry.pieceCid as unknown as PieceCID,
  });

  if (!status) {
    return {
      pieceCid: entry.pieceCid,
      lastProven: null,
      nextProofDue: null,
      isOverdue: false,
      inChallengeWindow: false,
      hoursUntilChallengeWindow: null,
      retrievalUrl: null,
      pieceId: null,
    };
  }

  return {
    pieceCid: entry.pieceCid,
    lastProven: status.dataSetLastProven
      ? status.dataSetLastProven.toISOString()
      : null,
    nextProofDue: status.dataSetNextProofDue
      ? status.dataSetNextProofDue.toISOString()
      : null,
    isOverdue: !!status.isProofOverdue,
    inChallengeWindow: !!status.inChallengeWindow,
    hoursUntilChallengeWindow: status.hoursUntilChallengeWindow ?? null,
    retrievalUrl: status.retrievalUrl ?? null,
    pieceId: status.pieceId != null ? String(status.pieceId) : null,
  };
}

/**
 * Cryptographically-random short id for shareable URLs. 12 base32 chars
 * (~60 bits) — plenty of entropy for a demo and URL-friendly.
 */
function makeId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let out = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out.slice(0, 12);
}
