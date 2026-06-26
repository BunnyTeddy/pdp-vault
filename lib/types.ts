/**
 * A vault entry — the metadata we persist for each uploaded file so the public
 * verify page can resolve and re-check the on-chain PDP proof later.
 *
 * We store everything needed to *re-derive* the proof state independently of
 * the uploader: pieceCid + dataSetId + providerId are sufficient for any reader
 * on any machine to call `context.pieceStatus()` and verify.
 */
export interface VaultEntry {
  /** Short random id used in the shareable URL (/v/<id>). */
  id: string;
  /** CommP piece CID — the content-addressed identifier on Filecoin. */
  pieceCid: string;
  /** On-chain data set id (per provider). */
  dataSetId: string;
  /** Storage provider numeric id (registry id). */
  providerId: string;
  /** Storage provider ethereum address. */
  providerAddress: string;
  /** PDP/SP service base URL (for direct retrieval / proof endpoints). */
  serviceURL: string;
  /** Bytes of the original file. */
  size: number;
  /** Original filename (as uploaded). */
  filename: string;
  /** Optional public note the uploader attached. */
  note?: string;
  /** ISO timestamp of upload. */
  createdAt: string;
  /** Whether CDN retrieval is enabled for this data set. */
  withCDN: boolean;
}

/** Shape returned by /api/upload on success. */
export interface UploadResponse {
  id: string;
  url: string;
  pieceCid: string;
  dataSetId: string;
  providerId: string;
  size: number;
}

/** Shape returned by /api/status — the live PDP proof read. */
export interface ProofStatus {
  pieceCid: string;
  /** Last epoch the data set was proven at, as a Date (or null if never). */
  lastProven: string | null;
  /** Next epoch a proof is due, as a Date (or null). */
  nextProofDue: string | null;
  /** True when a proof is overdue — i.e. storage can no longer be guaranteed. */
  isOverdue: boolean;
  /** True while the piece is inside its challenge/proof window right now. */
  inChallengeWindow: boolean;
  /** Hours until the challenge window opens (if known). */
  hoursUntilChallengeWindow: number | null;
  /** Direct retrieval URL for the piece (if known). */
  retrievalUrl: string | null;
  /** Stable on-chain piece id within the data set. */
  pieceId: string | null;
}
