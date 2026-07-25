export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  is_premium: boolean;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  wholesale_price: number;
  retail_price: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  items: TransactionItem[];
  total: number;
  payment_method: 'cash' | 'mpesa' | 'debt';
  discount: number;
  created_at: string;
}

export interface TransactionItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Debtor {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  amount: number;
  notes: string;
  status: 'active' | 'cleared';
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debtor_id: string;
  amount: number;
  created_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  type: 'drawdown' | 'restock' | 'expense';
  category: string;
  amount: number;
  notes: string;
  created_at: string;
}

export type ViewPeriod = 'daily' | 'weekly' | 'monthly';
