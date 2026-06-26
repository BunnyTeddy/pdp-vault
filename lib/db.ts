import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { VaultEntry } from './types';

/**
 * Tiny persistence layer for vault entries.
 *
 * Two backends:
 *  - Vercel KV when KV_REST_API_URL + KV_REST_API_TOKEN are set (production).
 *  - A local JSON file otherwise (dev / any host, zero config).
 *
 * Both expose the same minimal API: save, get, listRecent.
 */

const USE_KV =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const LOCAL_FILE = path.join(process.cwd(), '.vault-store.json');
const LIST_KEY = 'pdp-vault:entries';
const entryKey = (id: string) => `pdp-vault:entry:${id}`;

// ---------------------------------------------------------------------------
// KV backend
// ---------------------------------------------------------------------------
async function kvSave(entry: VaultEntry): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(entryKey(entry.id), JSON.stringify(entry));
  // Push id to the front of a capped recent-list (keep last 100).
  await kv.lpush(LIST_KEY, entry.id);
  await kv.ltrim(LIST_KEY, 0, 99);
}

async function kvGet(id: string): Promise<VaultEntry | null> {
  const { kv } = await import('@vercel/kv');
  const raw = await kv.get<string>(entryKey(id));
  return raw ? (JSON.parse(raw) as VaultEntry) : null;
}

async function kvListRecent(limit: number): Promise<VaultEntry[]> {
  const { kv } = await import('@vercel/kv');
  const ids = await kv.lrange<string>(LIST_KEY, 0, limit - 1);
  if (ids.length === 0) return [];
  const entries = (await kv.mget<VaultEntry[]>(
    ...ids.map((id) => entryKey(id)),
  )) as unknown as (VaultEntry | null)[];
  return entries.filter((e): e is VaultEntry => e !== null);
}

// ---------------------------------------------------------------------------
// Local file backend
// ---------------------------------------------------------------------------
async function readLocal(): Promise<VaultEntry[]> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    return JSON.parse(raw) as VaultEntry[];
  } catch {
    return [];
  }
}

async function writeLocal(entries: VaultEntry[]): Promise<void> {
  await fs.writeFile(LOCAL_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

async function localSave(entry: VaultEntry): Promise<void> {
  const entries = await readLocal();
  entries.unshift(entry);
  await writeLocal(entries.slice(0, 100));
}

async function localGet(id: string): Promise<VaultEntry | null> {
  const entries = await readLocal();
  return entries.find((e) => e.id === id) ?? null;
}

async function localListRecent(limit: number): Promise<VaultEntry[]> {
  const entries = await readLocal();
  return entries.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function saveEntry(entry: VaultEntry): Promise<void> {
  if (USE_KV) await kvSave(entry);
  else await localSave(entry);
}

export async function getEntry(id: string): Promise<VaultEntry | null> {
  if (USE_KV) return kvGet(id);
  return localGet(id);
}

export async function listRecent(limit = 10): Promise<VaultEntry[]> {
  if (USE_KV) return kvListRecent(limit);
  return localListRecent(limit);
}
