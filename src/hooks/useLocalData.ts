import { useState, useEffect, useCallback } from 'react';

type TableName = 'products' | 'transactions' | 'debtors' | 'debtPayments' | 'payouts' | 'categories';

interface Record {
  _id: string;
  _creationTime: number;
  [key: string]: any;
}

function getTable<T extends Record>(table: TableName): T[] {
  try {
    const raw = localStorage.getItem(`dl-${table}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTable(table: TableName, data: any[]) {
  localStorage.setItem(`dl-${table}`, JSON.stringify(data));
}

export function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useLocalData<T extends Record>(table: TableName) {
  const [data, setData] = useState<T[]>(() => getTable(table));

  useEffect(() => {
    saveTable(table, data);
  }, [table, data]);

  const refresh = useCallback(() => {
    setData(getTable(table));
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

  return { data, add, update, remove, updateQuantity, getById, refresh };
}

export type { Record, TableName };
