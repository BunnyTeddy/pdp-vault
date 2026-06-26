/**
 * One-time relayer wallet setup for PDP Vault.
 *
 * What it does:
 *   1. Load (or generate) RELAYER_PRIVATE_KEY into .env
 *   2. Claim calibration testnet tFIL + tUSDFC from the faucet
 *   3. Deposit USDFC into the Filecoin payments contract
 *   4. Approve the warm-storage service as an operator (so it can spend on rails)
 *   5. Print balances + confirm ready
 *
 * Re-runnable: if the wallet is already funded it skips steps that are done.
 *
 * Usage:  npm run setup:relayer
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Synapse } from '@filoz/synapse-sdk';
import { calibration } from '@filoz/synapse-core/chains';
import { claimTokens } from '@filoz/synapse-core/utils';
import { parseUnits, formatUnits } from 'viem';
import { http, createPublicClient } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

const ENV_FILE = path.join(process.cwd(), '.env');
const RPC_URL = process.env.FILECOIN_RPC_URL || calibration.rpcUrls.default.http[0];

// Generous funding for a hackathon demo — covers many uploads + runway.
// The faucet dispenses ~5 USDFC per claim; we deposit most of it and keep a
// small buffer. Warm-storage rates are tiny (fractions of a cent per epoch),
// so this funds hundreds of small demo uploads.
const DEPOSIT_USDFC = '4'; // into payments contract
const RATE_ALLOWANCE = parseUnits('5', 18); // per-epoch spend cap
const LOCKUP_ALLOWANCE = parseUnits('50', 18); // max locked at once

function log(msg: string) {
  console.log(`[setup] ${msg}`);
}

async function main() {
  let privateKey = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;

  // 1. Generate a key if none exists, and persist to .env.
  if (!privateKey) {
    privateKey = generatePrivateKey();
    log('Generated a new relayer private key.');
    await persistEnv('RELAYER_PRIVATE_KEY', privateKey);
    log(`Saved RELAYER_PRIVATE_KEY to ${ENV_FILE}`);
  } else {
    log('Using existing RELAYER_PRIVATE_KEY from env.');
  }

  const account = privateKeyToAccount(privateKey);
  log(`Relayer address: ${account.address}`);

  // Public client for gas balance reads.
  const publicClient = createPublicClient({
    chain: calibration,
    transport: http(RPC_URL),
  });

  // Check current balance first — skip the faucet if already funded.
  let tFIL = 0n;
  try {
    tFIL = await publicClient.getBalance({ address: account.address });
  } catch {
    // account actor not on-chain yet
  }
  log(`Current tFIL balance: ${formatUnits(tFIL, 18)}`);

  // 2. Faucet — only if low on gas. Claim tFIL + tUSDFC (with rate-limit retries).
  if (tFIL < parseUnits('0.5', 18)) {
    log('Claiming testnet tokens from faucet (tFIL + tUSDFC)...');
    let faucetOk = false;
    for (let attempt = 1; attempt <= 3 && !faucetOk; attempt++) {
      try {
        const claimResult = await claimTokens({ address: account.address });
        log(`Faucet response: ${JSON.stringify(claimResult)}`);
        faucetOk = true;
      } catch (err) {
        const msg = (err as Error).message;
        if (/rate|too many|429/i.test(msg)) {
          const wait = 40 * attempt;
          log(`  Rate limited (attempt ${attempt}/3). Waiting ${wait}s...`);
          await sleep(wait * 1000);
        } else {
          log(`Faucet claim error: ${msg}`);
          break;
        }
      }
    }
    if (!faucetOk) {
      log(
        'Could not claim from faucet automatically.\n' +
          `  → Claim tFIL manually at https://forest-explorer.chainsafe.dev/ for\n` +
          `    ${account.address}, then re-run this script.`,
      );
    }

    // Wait for faucet tx to land and the on-chain actor to be created.
    log('Waiting for faucet funds to land on-chain (polling up to 2min)...');
    for (let i = 0; i < 24; i++) {
      try {
        tFIL = await publicClient.getBalance({ address: account.address });
      } catch {
        // actor not created yet
      }
      if (tFIL > 0n) break;
      await sleep(5000);
    }
    log(`tFIL balance: ${formatUnits(tFIL, 18)}`);
  } else {
    log('Already funded with tFIL — skipping faucet.');
  }

  if (tFIL === 0n) {
    log(
      'No tFIL — faucet did not credit in time. Please wait a minute and re-run;\n' +
        '  the key is already saved in .env so this run is idempotent.',
    );
    return;
  }

  // 3. Boot Synapse with the relayer account.
  log('Initializing Synapse...');
  const synapse = await Synapse.create({
    chain: calibration,
    account,
    transport: http(RPC_URL),
    withCDN: true,
    source: 'pdp-vault-setup',
  });

  // USDFC balance — the faucet sends a separate USDFC tx that may lag tFIL.
  let walletUSDFC = 0n;
  for (let i = 0; i < 24 && walletUSDFC === 0n; i++) {
    try {
      walletUSDFC = await synapse.payments.walletBalance({ token: 'USDFC' });
    } catch {
      // not ready
    }
    if (walletUSDFC === 0n) await sleep(5000);
  }
  log(`Wallet USDFC: ${formatUnits(walletUSDFC, 18)}`);

  if (walletUSDFC === 0n) {
    log(
      'No USDFC in wallet — faucet may not have credited yet. Re-run in a minute\n' +
        '  or claim USDFC manually at https://forest-explorer.chainsafe.dev/',
    );
    // Don't hard-fail; we still printed the address for manual claim.
    return;
  }

  // 4. Deposit USDFC into the payments contract (funds storage rails).
  const depositedAlready = await synapse.payments.balance({ token: 'USDFC' });
  if (depositedAlready > parseUnits(DEPOSIT_USDFC, 18)) {
    log(`Already deposited ${formatUnits(depositedAlready, 18)} USDFC — skipping deposit.`);
  } else {
    log(`Depositing ${DEPOSIT_USDFC} USDFC into payments contract...`);
    const depositHash = await synapse.payments.deposit({
      amount: parseUnits(DEPOSIT_USDFC, 18),
      token: 'USDFC',
      onApprovalTransaction: (h) => log(`  approval tx: ${h}`),
      onDepositStarting: () => log('  approval confirmed, depositing...'),
    });
    log(`  deposit tx: ${depositHash}`);
  }

  // 5. Approve the warm-storage service as operator (one-time).
  log('Approving warm-storage service as operator...');
  const approveHash = await synapse.payments.approveService({
    rateAllowance: RATE_ALLOWANCE,
    lockupAllowance: LOCKUP_ALLOWANCE,
    maxLockupPeriod: 86400n * 2n, // ~2 months
    token: 'USDFC',
  });
  log(`  approveService tx: ${approveHash}`);

  // 6. Final state.
  const finalDeposit = await synapse.payments.balance({ token: 'USDFC' });
  log('---- Relayer ready ----');
  log(`Address:        ${account.address}`);
  log(`tFIL:           ${formatUnits(tFIL, 18)}`);
  log(`USDFC deposited: ${formatUnits(finalDeposit, 18)}`);
  log('Relayer is funded and approved. Start the app with `npm run dev`.');
}

async function persistEnv(key: string, value: string) {
  let existing = '';
  try {
    existing = await fs.readFile(ENV_FILE, 'utf8');
  } catch {
    // no file yet
  }
  const lines = existing.split('\n').filter((l) => l.trim() && !l.startsWith(`${key}=`));
  lines.push(`${key}=${value}`);
  await fs.writeFile(ENV_FILE, lines.join('\n') + '\n', 'utf8');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('[setup] FATAL:', err);
  process.exit(1);
});
