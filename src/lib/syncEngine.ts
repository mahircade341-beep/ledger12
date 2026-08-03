/**
 * syncEngine — flushes queued offline writes ("outbox") to Supabase whenever a
 * connection is available, and triggers a re-pull of fresh data afterwards.
 *
 * Strategy: writes always land on-device first (see useLocalData). While online
 * they are pushed through immediately; while offline they accumulate in the
 * outbox and are replayed in order the moment connectivity returns. After a
 * successful flush the local cache is refreshed from the server so the device
 * and the account agree. Conflicts are last-write-wins by queue order, which is
 * the right model for a single-owner shop app.
 */

import { supabase } from './supabase';
import { getOutbox, withOutboxLock, setOutboxRaw, setLastSynced, notifySyncChanged } from './localStore';
import type { SyncOp } from './localStore';

// Our table names → Supabase table names (shared by the data hook and the engine)
export const TABLE_MAP: Record<string, string> = {
  products: 'products',
  transactions: 'transactions',
  debtors: 'debtors',
  debtPayments: 'debt_payments',
  payouts: 'payouts',
  stockAdjustments: 'stock_adjustments',
};

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

/**
 * Replay every queued op for a user, oldest first. Ops that fail (still offline,
 * auth expired, etc.) stay queued for the next attempt. Returns the number of ops
 * successfully pushed.
 *
 * The read-process-replace runs inside the outbox lock so a new offline write
 * that lands mid-sync is never clobbered by the "remaining" write-back.
 */
export async function flushOutboxForUser(userId: string): Promise<number> {
  if (syncing) return 0;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0; // signed out — queue is cleared on sign-out anyway

  syncing = true;
  notifySyncChanged();
  try {
    return await withOutboxLock(async () => {
      const ops = await getOutbox(userId);
      if (!ops.length) return 0;

      let flushed = 0;
      const remaining: SyncOp[] = [];

      for (const op of ops) {
        const supabaseTable = TABLE_MAP[op.table];
        if (!supabaseTable) {
          remaining.push(op);
          continue;
        }
        try {
          if (op.kind === 'insert') {
            const { error } = await supabase.from(supabaseTable).insert(op.payload);
            if (error) throw error;
          } else if (op.kind === 'update') {
            const { error } = await supabase.from(supabaseTable).update(op.payload).eq('id', op.id);
            if (error) throw error;
          } else if (op.kind === 'delete') {
            const { error } = await supabase.from(supabaseTable).delete().eq('id', op.id);
            if (error) throw error;
          }
          flushed += 1;
        } catch (err) {
          // Offline or server rejected — keep it queued for the next sync attempt.
          remaining.push(op);
        }
      }

      await setOutboxRaw(userId, remaining);
      if (flushed > 0) {
        await setLastSynced(userId, Date.now());
      }
      return flushed;
    });
  } finally {
    syncing = false;
    notifySyncChanged();
  }
}

/** Push any pending changes for the current user to the cloud. */
export async function syncNow(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await flushOutboxForUser(data.session.user.id);
  } catch {
    // never throw into UI handlers
  }
}

let autoSyncStarted = false;

/** Wire up automatic sync: when the app comes back online / regains focus. */
export function startAutoSync(): void {
  if (autoSyncStarted) return;
  autoSyncStarted = true;

  const trigger = () => {
    syncNow().catch(() => {});
  };

  window.addEventListener('online', trigger);
  window.addEventListener('focus', trigger);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') trigger();
  });
}
