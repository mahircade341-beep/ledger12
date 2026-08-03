import { useEffect, useState } from 'react';
import { onSyncChanged, getOutbox, getSyncMeta } from '../lib/localStore';
import { isSyncing } from '../lib/syncEngine';
import { getCurrentUserId } from '../lib/supabase';

export interface SyncStatus {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncedAt: number | null;
}

/**
 * Live view of the sync engine: whether we're online, how many offline edits are
 * waiting to reach the cloud, whether a sync is in flight, and when the last one
 * completed. Re-renders on every outbox change and connectivity change.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pending: 0,
    syncing: false,
    lastSyncedAt: null,
  }));

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const userId = await getCurrentUserId();
      let pending = 0;
      let lastSyncedAt: number | null = null;
      if (userId) {
        pending = (await getOutbox(userId)).length;
        const meta = await getSyncMeta(userId);
        lastSyncedAt = meta.lastSyncedAt;
      }
      if (!cancelled) {
        setStatus({
          online: navigator.onLine,
          pending,
          syncing: isSyncing(),
          lastSyncedAt,
        });
      }
    };

    const unsub = onSyncChanged(() => {
      refresh();
    });
    const onOnline = () => {
      setStatus((s) => ({ ...s, online: true }));
      refresh();
    };
    const onOffline = () => setStatus((s) => ({ ...s, online: false }));

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refresh();

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return status;
}
