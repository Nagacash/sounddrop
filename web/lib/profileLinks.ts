/** Normalize optional http(s) profile links. Empty input → ''. Invalid → ''. */
export function normalizeProfileUrl(raw: unknown, maxLen = 500): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, maxLen);
  if (!trimmed) return '';

  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    // Block javascript: etc already handled; reject credentials / weird hosts lightly.
    if (!u.hostname) return '';
    return u.toString();
  } catch {
    return '';
  }
}
