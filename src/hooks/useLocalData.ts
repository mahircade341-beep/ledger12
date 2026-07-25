import { useState, useEffect, useCallback } from 'react';

type TableName = 'products' | 'transactions' | 'debtors' | 'debtPayments' | 'payouts' | 'categories';

interface Record {
  _id: string;
  _creationTime: number;
  [key: string]: any;
}

// --- IndexedDB backed storage with localStorage fallback ---
const DB_NAME = 'DukaLedgerDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const tables: TableName[] = ['products', 'transactions', 'debtors', 'debtPayments', 'payouts', 'categories'];
      tables.forEach((t) => {
        if (!db.objectStoreNames.contains(t)) {
          const store = db.createObjectStore(t, { keyPath: '_id' });
          store.createIndex('_creationTime', '_creationTime', { unique: false });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(table: string): Promise<T[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(table, 'readonly');
      const store = tx.objectStore(table);
      const req = store.getAll();
      req.onsuccess = () => { resolve(req.result || []); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch {
    // Fallback to localStorage
    try { const raw = localStorage.getItem(`dl-${table}`); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }
}

async function idbSaveAll(table: string, data: any[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(table, 'readwrite');
      const store = tx.objectStore(table);
      store.clear();
      data.forEach((item) => store.put(item));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    });
  } catch {
    localStorage.setItem(`dl-${table}`, JSON.stringify(data));
  }
}

// --- Helper: convert image file to base64 data URL ---
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useLocalData<T extends Record>(table: TableName) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    idbGetAll<T>(table).then((result) => {
      if (mounted) { setData(result); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [table]);

  // Persist changes
  useEffect(() => {
    if (!loading) idbSaveAll(table, data);
  }, [table, data, loading]);

  const refresh = useCallback(async () => {
    const result = await idbGetAll<T>(table);
    setData(result);
  }, [table]);

  const add = useCallback((record: Omit<T, '_id' | '_creationTime'>): string => {
    const id = genId();
    const newRecord = { ...record, _id: id, _creationTime: Date.now() } as unknown as T;
    setData((prev) => [newRecord, ...prev]);
    return id;
  }, []);

  const update = useCallback((id: string, changes: Partial<T>) => {
    setData((prev) => prev.map((r) => r._id === id ? { ...r, ...changes } : r));
  }, []);

  const remove = useCallback((id: string) => {
    setData((prev) => prev.filter((r) => r._id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, newQty: number) => {
    setData((prev) => prev.map((r) => r._id === id ? { ...r, quantity: newQty } : r));
  }, []);

  const getById = useCallback((id: string): T | undefined => {
    return data.find((r) => r._id === id);
  }, [data]);

  const addAll = useCallback((items: T[]) => {
    setData((prev) => [...items, ...prev]);
  }, []);

  const clearAll = useCallback(() => {
    setData([]);
  }, []);

  return { data, add, update, remove, updateQuantity, getById, refresh, addAll, clearAll, loading };
}

export type { Record, TableName };
