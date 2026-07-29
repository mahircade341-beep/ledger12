-- Premium Setup Migration
-- Run this in your Supabase SQL Editor

-- 1. Add premium columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 2. Create premium_payments table for tracking verified M-Pesa payments
CREATE TABLE IF NOT EXISTS premium_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  mpesa_receipt_number TEXT NOT NULL UNIQUE,  -- unique M-Pesa confirmation code
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE premium_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create unique index on mpesa_receipt_number for anti-duplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_payments_receipt ON premium_payments(mpesa_receipt_number);

-- 5. RLS policies
-- Users can view their own payment records
CREATE POLICY "Users can view own payments"
  ON premium_payments FOR SELECT
  USING (user_id = auth.uid());

-- Authenticated users can insert their own payments
CREATE POLICY "Users can insert own payments"
  ON premium_payments FOR INSERT
  WITH CHECK (user_id = auth.uid());
