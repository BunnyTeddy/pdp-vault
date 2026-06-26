import { calibration } from '@filoz/synapse-core/chains';

/**
 * Beryx explorer links for the Filecoin calibration testnet.
 */
const BERYX = calibration.blockExplorers?.Beryx.url ?? 'https://beryx.io/fil/calibration';

export function beryxAddress(address: string): string {
  return `${BERYX}/address/${address}`;
}

export function beryxTx(hash: string): string {
  return `${BERYX}/tx/${hash}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'in the future';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
