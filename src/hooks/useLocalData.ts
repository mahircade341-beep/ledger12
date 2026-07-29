import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type TableName = 'products' | 'transactions' | 'debtors' | 'debtPayments' | 'payouts' | 'stockAdjustments';

interface AppRecord {
  _id: string;
  _creationTime: number;
  [key: string]: any;
}

// Map our table names to Supabase table names
const TABLE_MAP: Record<string, string> = {
  products: 'products',
  transactions: 'transactions',
  debtors: 'debtors',
  debtPayments: 'debt_payments',
  payouts: 'payouts',
  stockAdjustments: 'stock_adjustments',
};

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

export function useLocalData<T extends AppRecord>(table: TableName) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseTable = TABLE_MAP[table];

  // Load from Supabase on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function fetchData() {
      const { data: result, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        if (mounted) { setData([]); setLoading(false); }
        return;
      }

      const mapped = (result || []).map((item: any) => ({
        _id: item.id,
        _creationTime: new Date(item.created_at || Date.now()).getTime(),
        userId: item.user_id,
        ...mapFromSupabase(table, item),
      })) as unknown as T[];

      if (mounted) { setData(mapped); setLoading(false); }
    }

    fetchData();
    return () => { mounted = false; };
  }, [table, supabaseTable]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: result, error } = await supabase
      .from(supabaseTable)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error refreshing ${table}:`, error);
      setLoading(false);
      return;
    }

    const mapped = (result || []).map((item: any) => ({
      _id: item.id,
      _creationTime: new Date(item.created_at || Date.now()).getTime(),
      userId: item.user_id,
      ...mapFromSupabase(table, item),
    })) as unknown as T[];

    setData(mapped);
    setLoading(false);
  }, [table, supabaseTable]);

  const add = useCallback((record: Omit<T, '_id' | '_creationTime'>): string => {
    const id = genId();
    const supabaseRecord = mapToSupabase(table, record, id);
    
    const newRecord = { ...record, _id: id, _creationTime: Date.now() } as unknown as T;
    setData((prev) => [newRecord, ...prev]);

    supabase.from(supabaseTable).insert(supabaseRecord).then(({ error }) => {
      if (error) console.error(`Error inserting ${table}:`, error);
    });

    return id;
  }, [table, supabaseTable]);

  const update = useCallback((id: string, changes: Partial<T>) => {
    setData((prev) => prev.map((r) => r._id === id ? { ...r, ...changes } : r));

    const supabaseChanges = mapChangesToSupabase(table, changes as any);
    supabase.from(supabaseTable).update(supabaseChanges).eq('id', id).then(({ error }) => {
      if (error) console.error(`Error updating ${table}:`, error);
    });
  }, [table, supabaseTable]);

  const remove = useCallback((id: string) => {
    setData((prev) => prev.filter((r) => r._id !== id));
    supabase.from(supabaseTable).delete().eq('id', id).then(({ error }) => {
      if (error) console.error(`Error deleting ${table}:`, error);
    });
  }, [table, supabaseTable]);

  const updateQuantity = useCallback((id: string, newQty: number) => {
    setData((prev) => prev.map((r) => r._id === id ? { ...r, quantity: newQty } : r));
    supabase.from(supabaseTable).update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
      if (error) console.error(`Error updating quantity:`, error);
    });
  }, [table, supabaseTable]);

  const getById = useCallback((id: string): T | undefined => {
    return data.find((r) => r._id === id);
  }, [data]);

  const addAll = useCallback((items: T[]) => {
    setData((prev) => [...items, ...prev]);
    const records = items.map((item) => mapToSupabase(table, item));
    if (records.length > 0) {
      supabase.from(supabaseTable).insert(records).then(({ error }) => {
        if (error) console.error(`Error bulk inserting ${table}:`, error);
      });
    }
  }, [table, supabaseTable]);

  const clearAll = useCallback(() => {
    setData([]);
  }, []);

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
