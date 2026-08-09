const RESERVED = new Set([
  'setup',
  'admin',
  'api',
  'policy',
  'sign-in',
  'sign-up',
  'login',
  'new',
  'edit',
  'track',
  'tracks',
  'media',
]);

/** URL-safe slug from an artist display name. */
export function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48);

  if (!base || RESERVED.has(base)) return 'artist';
  return base;
}

/** Prefer clean name slug; on conflict / reserved, append a short key fingerprint. */
export function artistSlug(displayName: string, publicKeyHash: string, taken?: Set<string>): string {
  const base = slugifyName(displayName);
  const short = publicKeyHash.slice(0, 8);
  let candidate = base;

  if (taken?.has(candidate) || RESERVED.has(candidate)) {
    candidate = `${base}-${short}`;
  }
  if (taken?.has(candidate)) {
    candidate = `${base}-${publicKeyHash.slice(0, 12)}`;
  }
  taken?.add(candidate);
  return candidate;
}
