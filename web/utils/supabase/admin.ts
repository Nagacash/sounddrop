import { createClient } from '@supabase/supabase-js';
import { supabaseHeaders, unwrapEnvSecret } from '@/utils/supabase/apiKey';

/**
 * Server-only Supabase client with the secret key (bypasses RLS).
 * Use in Route Handlers / Server Actions — never import from client components.
 *
 * New `sb_secret_…` keys are not JWTs. Storage returns "Invalid Compact JWS"
 * if they are sent as `Authorization: Bearer`. Put them on `apikey` only.
 */
export function createServiceClient() {
  const url = unwrapEnvSecret(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = unwrapEnvSecret(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => {
        const headers = supabaseHeaders(key, init?.headers);
        return fetch(input, { ...init, headers, cache: 'no-store' });
      },
    },
  });
}
