import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { loadTableRows, saveTableRows, pushOps, getOutbox } from '../lib/localStore';
import type { SyncOp } from '../lib/localStore';
import { TABLE_MAP, syncNow } from '../lib/syncEngine';

type TableName = 'products' | 'transactions' | 'debtors' | 'debtPayments' | 'payouts' | 'stockAdjustments';

interface AppRecord {
  _id: string;
  _creationTime: number;
  [key: string]: any;
}

// ── Cross-component sync: broadcast data changes via window events ──
const EVENT_PREFIX = 'dl-data-changed:';
const STORAGE_KEY_PREFIX = 'dl-sync:';

function emitDataChanged(table: string) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT_PREFIX + table));
  } catch {
    // silently fail if event dispatch is unavailable
  }
  // Also ping localStorage so OTHER browser tabs pick up the change
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + table, String(Date.now()));
  } catch {
    // storage may be unavailable (private mode) — events above still cover this tab
  }
}

function listenDataChanged(table: string, handler: () => void) {
  window.addEventListener(EVENT_PREFIX + table, handler);
  return () => window.removeEventListener(EVENT_PREFIX + table, handler);
}

// ── Helpers ──

export function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fetchAll(table: string, supabaseTable: string): Promise<any[]> {
  const { data: result, error } = await supabase
    .from(supabaseTable)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }

  return (result || []).map((item: any) => ({
    _id: item.id,
    _creationTime: new Date(item.created_at || Date.now()).getTime(),
    userId: item.user_id,
    ...mapFromSupabase(table, item),
  }));
}

/**
 * Offline-first data hook.
 *
 * Reads: served instantly from the on-device cache, then refreshed from the
 * cloud whenever a connection is available.
 * Writes: applied optimistically to the UI and persisted on-device, then queued
 * into the outbox. The queue is flushed to the account immediately when online
 * and automatically the moment the connection returns (see syncEngine).
 */
export function useLocalData<T extends AppRecord>(table: TableName) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseTable = TABLE_MAP[table];
  const mountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const dataRef = useRef<T[]>([]);

  // Keep state + a live mirror in sync, and persist every change on-device.
  const applyData = useCallback((next: T[]) => {
    dataRef.current = next;
    setData(next);
    const userId = userIdRef.current;
    if (userId) {
      saveTableRows(userId, table, next).catch(() => {});
    }
  }, [table]);

  // Instant local read so the UI paints before any network round-trip.
  const hydrateFromCache = useCallback(async (userId: string) => {
    const rows = await loadTableRows(userId, table);
    if (mountedRef.current && rows) {
      dataRef.current = rows as unknown as T[];
      setData(rows as unknown as T[]);
      setLoading(false);
    }
  }, [table]);

  // Network pull → becomes the new local truth.
  const pullFromServer = useCallback(async (userId: string) => {
    const mapped = await fetchAll(table, supabaseTable);
    if (mountedRef.current) {
      dataRef.current = mapped as unknown as T[];
      setData(mapped as unknown as T[]);
      setLoading(false);
    }
    await saveTableRows(userId, table, mapped);
    return mapped;
  }, [table, supabaseTable]);

  const refreshData = useCallback(async (userId: string | null) => {
    if (!userId) {
      // No session (e.g. public pages) — plain network read, as before.
      const mapped = await fetchAll(table, supabaseTable);
      if (mountedRef.current) {
        dataRef.current = mapped as unknown as T[];
        setData(mapped as unknown as T[]);
        setLoading(false);
      }
      return;
    }

    await hydrateFromCache(userId);

    if (navigator.onLine) {
      // Flush any queued local changes for this table BEFORE overwriting local
      // state with server truth, so offline edits are never clobbered.
      const pending = await getOutbox(userId);
      if (pending.some((op) => op.table === table)) {
        await syncNow();
      }
      await pullFromServer(userId);
    } else if (mountedRef.current) {
      setLoading(false);
    }
  }, [table, supabaseTable, hydrateFromCache, pullFromServer]);

  // ── Load on mount + listen for cross-component sync events ──
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    (async () => {
      const userId = await getCurrentUserId();
      if (!mountedRef.current) return;
      userIdRef.current = userId;
      await refreshData(userId);
    })();

    const unsub = listenDataChanged(table, () => {
      refreshData(userIdRef.current);
    });

    // Cross-tab sync: another browser tab wrote to this table
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PREFIX + table) {
        refreshData(userIdRef.current);
      }
    };

    // Refresh when the tab regains focus — catches writes that landed while away
    let focusTimer: any;
    const refreshOnFocus = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        refreshData(userIdRef.current);
      }, 150);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshOnFocus();
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(focusTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refreshOnFocus);
      unsub();
    };
  }, [table, supabaseTable, refreshData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await refreshData(userIdRef.current);
  }, [refreshData]);

  // Queue an op for cloud backup and push it immediately when online.
  const queueOp = useCallback((op: Omit<SyncOp, 'seq'>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const full: SyncOp = { ...op, seq: Date.now() + Math.random() };
    pushOps(userId, [full]).catch(() => {});
    if (navigator.onLine) {
      syncNow().catch(() => {});
    }
  }, []);

  const add = useCallback((record: Omit<T, '_id' | '_creationTime'>): string => {
    const id = genId();
    const supabaseRecord = mapToSupabase(table, record, id);

    const newRecord = { ...record, _id: id, _creationTime: Date.now() } as unknown as T;
    // Optimistic local update — the new item is instantly visible everywhere in this tab
    applyData([newRecord, ...dataRef.current]);
    // Broadcast immediately so other components (POS, Inventory) refresh without waiting for the network round-trip
    emitDataChanged(table);

    queueOp({ kind: 'insert', table, id, payload: supabaseRecord });

    return id;
  }, [table, applyData, queueOp]);

  const update = useCallback((id: string, changes: Partial<T>) => {
    applyData(dataRef.current.map((r) => (r._id === id ? { ...r, ...changes } : r)));
    emitDataChanged(table);

    const supabaseChanges = mapChangesToSupabase(table, changes as any);
    queueOp({ kind: 'update', table, id, payload: supabaseChanges });
  }, [table, applyData, queueOp]);

  const remove = useCallback((id: string) => {
    applyData(dataRef.current.filter((r) => r._id !== id));
    emitDataChanged(table);
    queueOp({ kind: 'delete', table, id });
  }, [table, applyData, queueOp]);

  const updateQuantity = useCallback((id: string, newQty: number) => {
    applyData(dataRef.current.map((r) => (r._id === id ? { ...r, quantity: newQty } : r)));
    emitDataChanged(table);
    queueOp({
      kind: 'update',
      table,
      id,
      payload: { quantity: newQty, updated_at: new Date().toISOString() },
    });
  }, [table, applyData, queueOp]);

  const getById = useCallback((id: string): T | undefined => {
    return data.find((r) => r._id === id);
  }, [data]);

  const addAll = useCallback((items: T[]) => {
    applyData([...items, ...dataRef.current]);
    emitDataChanged(table);
    if (items.length > 0) {
      const records = items.map((item) => mapToSupabase(table, item));
      const ops: SyncOp[] = records.map((payload, i) => ({
        kind: 'insert',
        table,
        id: (items[i] as any)._id,
        payload,
        seq: Date.now() + i + Math.random(),
      }));
      const userId = userIdRef.current;
      if (userId) {
        pushOps(userId, ops).catch(() => {});
        if (navigator.onLine) syncNow().catch(() => {});
      }
    }
  }, [table, applyData]);

  const clearAll = useCallback(() => {
    applyData([]);
    emitDataChanged(table);
  }, [table, applyData]);

  return { data, add, update, remove, updateQuantity, getById, refresh, addAll, clearAll, loading };
}

export type { TableName };

// --------------------------
// Field mapping helpers
// --------------------------

function mapFromSupabase(table: string, item: any): any {
  switch (table) {
    case 'products':
      return {
        name: item.name,
        quantity: item.quantity || 0,
        wholesalePrice: item.wholesale_price || 0,
        retailPrice: item.retail_price || 0,
        barcode: item.barcode || '',
        image: item.image || '',
        supplier: item.supplier || '',
        supplierPhone: item.supplier_phone || '',
      };
    case 'transactions':
      return {
        items: item.items || [],
        total: item.total || 0,
        paymentMethod: item.payment_method || 'cash',
        discount: item.discount || 0,
        pricing: item.pricing || 'retail',
        debtorId: item.debtorId || '',
        debtorName: item.debtorName || '',
      };
    case 'debtors':
      return {
        name: item.name,
        phone: item.phone || '',
        amount: item.amount || 0,
        notes: item.notes || '',
        status: item.status || 'active',
      };
    case 'debtPayments':
      return {
        debtorId: item.debtor_id || '',
        amount: item.amount || 0,
      };
    case 'payouts':
      return {
        type: item.type || 'drawdown',
        amount: item.amount || 0,
        notes: item.notes || '',
      };
    case 'stockAdjustments':
      return {
        productId: item.product_id || '',
        productName: item.product_name || '',
        quantityChange: item.quantity_change || 0,
        previousQuantity: item.previous_quantity || 0,
        newQuantity: item.new_quantity || 0,
        type: item.type || 'restock',
        notes: item.notes || '',
      };
    default:
      return item;
  }
}

function mapToSupabase(table: string, record: any, id?: string): any {
  const base: any = { user_id: record.userId };
  if (id) base.id = id;

  switch (table) {
    case 'products':
      return { ...base, name: record.name || '', quantity: record.quantity || 0, wholesale_price: record.wholesalePrice || 0, retail_price: record.retailPrice || 0, barcode: record.barcode || '', image: record.image || '', supplier: record.supplier || '', supplier_phone: record.supplierPhone || '' };
    case 'transactions':
      return { ...base, items: record.items || [], total: record.total || 0, payment_method: record.paymentMethod || 'cash', discount: record.discount || 0, pricing: record.pricing || 'retail', debtorId: record.debtorId || '', debtorName: record.debtorName || '' };
    case 'debtors':
      return { ...base, name: record.name || '', phone: record.phone || '', amount: record.amount || 0, notes: record.notes || '', status: record.status || 'active' };
    case 'debtPayments':
      return { ...base, debtor_id: record.debtorId || '', amount: record.amount || 0 };
    case 'payouts':
      return { ...base, type: record.type || 'drawdown', amount: record.amount || 0, notes: record.notes || '' };
    case 'stockAdjustments':
      return { ...base, product_id: record.productId || '', product_name: record.productName || '', quantity_change: record.quantityChange || 0, previous_quantity: record.previousQuantity || 0, new_quantity: record.newQuantity || 0, type: record.type || 'restock', notes: record.notes || '' };
    default:
      return { ...base, ...record };
  }
}

function mapChangesToSupabase(table: string, changes: any): any {
  switch (table) {
    case 'products':
      return { name: changes.name, quantity: changes.quantity, wholesale_price: changes.wholesalePrice, retail_price: changes.retailPrice, barcode: changes.barcode, image: changes.image, supplier: changes.supplier, supplier_phone: changes.supplierPhone, updated_at: new Date().toISOString() };
    case 'transactions':
      return { items: changes.items, total: changes.total, payment_method: changes.paymentMethod, discount: changes.discount, pricing: changes.pricing, debtorId: changes.debtorId, debtorName: changes.debtorName };
    case 'debtors':
      return { name: changes.name, phone: changes.phone, amount: changes.amount, notes: changes.notes, status: changes.status, updated_at: new Date().toISOString() };
    case 'debtPayments':
      return { debtor_id: changes.debtorId, amount: changes.amount };
    case 'payouts':
      return { type: changes.type, amount: changes.amount, notes: changes.notes };
    case 'stockAdjustments':
      return { product_id: changes.productId, product_name: changes.productName, quantity_change: changes.quantityChange, previous_quantity: changes.previousQuantity, new_quantity: changes.newQuantity, type: changes.type, notes: changes.notes };
    default:
      return changes;
  }
}
