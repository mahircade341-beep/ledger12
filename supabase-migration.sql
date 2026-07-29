-- ============================================================
-- DukaHub - Supabase Database Schema (v1.0)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;
DROP POLICY IF EXISTS "debtors_select" ON debtors;
DROP POLICY IF EXISTS "debtors_insert" ON debtors;
DROP POLICY IF EXISTS "debtors_update" ON debtors;
DROP POLICY IF EXISTS "debtors_delete" ON debtors;
DROP POLICY IF EXISTS "debt_payments_select" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_delete" ON debt_payments;
DROP POLICY IF EXISTS "payouts_select" ON payouts;
DROP POLICY IF EXISTS "payouts_insert" ON payouts;
DROP POLICY IF EXISTS "payouts_update" ON payouts;
DROP POLICY IF EXISTS "payouts_delete" ON payouts;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- 0. PROFILES (for store name, staff password, and role management)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  store_name TEXT DEFAULT '',
  staff_password TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to read their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = user_id);
-- Allow public (unauthenticated) read access for store_name and staff_password for staff login
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT
  USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- 1. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  wholesale_price NUMERIC(12,2) DEFAULT 0,
  retail_price NUMERIC(12,2) DEFAULT 0,
  category TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  image TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  supplier_phone TEXT DEFAULT '',
  threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete" ON products FOR DELETE USING (auth.uid() = user_id);

-- 2. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  discount NUMERIC(12,2) DEFAULT 0,
  pricing TEXT DEFAULT 'retail',
  "debtorId" TEXT DEFAULT '',
  "debtorName" TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- 3. DEBTORS
CREATE TABLE IF NOT EXISTS debtors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debtors_select" ON debtors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debtors_insert" ON debtors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debtors_update" ON debtors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debtors_delete" ON debtors FOR DELETE USING (auth.uid() = user_id);

-- 4. DEBT PAYMENTS
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  debtor_id UUID REFERENCES debtors(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_payments_select" ON debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debt_payments_insert" ON debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debt_payments_delete" ON debt_payments FOR DELETE USING (auth.uid() = user_id);

-- 5. PAYOUTS
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT DEFAULT 'drawdown',
  category TEXT DEFAULT '',
  amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_select" ON payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payouts_insert" ON payouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payouts_update" ON payouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payouts_delete" ON payouts FOR DELETE USING (auth.uid() = user_id);

-- 6. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for all tables
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE products;
ALTER publication supabase_realtime ADD TABLE transactions;
ALTER publication supabase_realtime ADD TABLE debtors;
ALTER publication supabase_realtime ADD TABLE debt_payments;
ALTER publication supabase_realtime ADD TABLE payouts;
ALTER publication supabase_realtime ADD TABLE categories;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debtors_user ON debtors(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debtor ON debt_payments(debtor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, store_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'store_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    store_name = EXCLUDED.store_name,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
