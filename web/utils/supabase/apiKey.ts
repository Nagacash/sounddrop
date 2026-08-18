/** New-format keys are opaque, not JWTs. Storage rejects them as Bearer tokens. */
export function isNewSupabaseApiKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');
}

export function isCompactJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/** Trim dotenv/Vercel quoting so a wrapped key is not sent as a bogus Bearer token. */
export function unwrapEnvSecret(raw: string | undefined): string {
  let value = (raw || '').trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

/**
 * Storage verifies Authorization as a compact JWS. Send new secret keys on
 * `apikey` only; keep Bearer only for legacy JWT service_role keys.
 */
export function supabaseHeaders(apiKey: string, incoming?: HeadersInit): Headers {
  const src = new Headers(incoming);
  const headers = new Headers();
  src.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') {
      const token = value.replace(/^Bearer\s+/i, '').trim();
      if (isCompactJwt(token) && !isNewSupabaseApiKey(token)) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return;
    }
    headers.set(key, value);
  });
  headers.set('apikey', apiKey);
  if (!headers.has('Authorization') && isCompactJwt(apiKey)) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }
  return headers;
}
