-- Premium Setup Migration
-- Run this in your Supabase SQL Editor

-- 1. Add premium columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 2. Create premium_payments table for tracking M-Pesa payments
CREATE TABLE IF NOT EXISTS premium_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT,
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  failure_reason TEXT,
  mpesa_receipt_number TEXT,
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE premium_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_premium_payments_checkout_request_id ON premium_payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_premium_payments_user_id ON premium_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_payments_status ON premium_payments(status);

-- 5. RLS policies
-- Users can view their own payment records
CREATE POLICY "Users can view own payments"
  ON premium_payments FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert any payment (used by Edge Functions)
CREATE POLICY "Service role can manage payments"
  ON premium_payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Drop the old is_premium column constraint if it existed differently
-- (keeping it as a cached convenience field, actual source of truth is premium_expires_at)
