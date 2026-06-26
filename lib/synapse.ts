import { Synapse } from '@filoz/synapse-sdk';
import { calibration } from '@filoz/synapse-core/chains';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Calibration testnet RPC. Overridable via env for resilience if the default
 * Glif endpoint is rate-limited.
 */
const RPC_URL =
  process.env.FILECOIN_RPC_URL || calibration.rpcUrls.default.http[0];

let synapsePromise: Promise<Synapse> | null = null;

/**
 * Get the single Synapse instance used by the app, backed by the server-held
 * relayer wallet.
 *
 * The relayer is the *payer* for uploads (it deposits USDFC and approves the
 * warm-storage service). We reuse the same instance for verify-page reads
 * (`pieceStatus`, data set lookups) because on Filecoin an eth_call's `from`
 * address must resolve to an on-chain actor — i.e. it must have received funds
 * at least once. An unfunded throwaway account throws "actor not found", so the
 * funded relayer account is required even for pure view calls.
 *
 * Using the relayer for reads is still trustless in the meaningful sense: reads
 * are public view calls against the RPC that return objective on-chain state
 * (proof epochs, data set membership). Nothing about the read depends on the
 * relayer "vouching" for anything. Cached per process — Synapse construction
 * reads chain state, so we only want to do it once.
 *
 * Throws clearly if the relayer key isn't configured.
 */
export function getRelayerSynapse(): Promise<Synapse> {
  if (!synapsePromise) {
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        'RELAYER_PRIVATE_KEY is not set. Run `npm run setup:relayer` first.',
      );
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    synapsePromise = Promise.resolve(
      Synapse.create({
        chain: calibration,
        account,
        transport: http(RPC_URL),
        withCDN: true,
        source: 'pdp-vault',
      }),
    );
  }
  return synapsePromise;
}

/**
 * Reads (verify page) reuse the relayer Synapse instance — see the note on
 * getRelayerSynapse for why a funded on-chain account is required for view calls.
 */
export function getReaderSynapse(): Promise<Synapse> {
  return getRelayerSynapse();
}

/**
 * Expose the chain + RPC constants the rest of the app needs without
 * re-importing synapse-core everywhere.
 */
export const CHAIN = calibration;
export const RPC = RPC_URL;
