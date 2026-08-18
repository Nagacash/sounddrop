import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client with the secret key (bypasses RLS).
 * Use in Route Handlers / Server Actions — never import from client components.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
