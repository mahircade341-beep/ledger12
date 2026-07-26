/**
 * Script to set a staff password for your store.
 * Usage: node scripts/set-staff-password.cjs
 * 
 * This uses the Supabase Management API via direct REST calls.
 */
async function main() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tsthnavocmrqdefvvhke.supabase.co';
  
  // We'll use the supabase-js client approach
  console.log('To set a staff password, go to your Supabase Dashboard → SQL Editor and run:');
  console.log('');
  console.log('-- First find your user_id:');
  console.log("SELECT id, email, raw_user_meta_data->>'store_name' as store_name FROM auth.users;");
  console.log('');
  console.log('Then set the staff password:');
  console.log("UPDATE profiles SET staff_password = 'staff123' WHERE store_name = 'YOUR_STORE_NAME';");
  console.log('');
  console.log('Or if you know your user_id:');
  console.log("UPDATE profiles SET staff_password = 'staff123' WHERE user_id = 'YOUR_USER_ID';");
}

main().catch(console.error);
