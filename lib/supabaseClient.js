import { createClient } from '@supabase/supabase-js'

// Public client — uses anon key, respects RLS
// Safe to use in Server Components for read-only storefront data
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Admin client — uses service role key, bypasses RLS
// ONLY use in Server Actions and Route Handlers (never expose to browser)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}