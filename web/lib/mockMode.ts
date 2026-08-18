/** MVP mock mode: Clerk optional; browse/play/upload without auth. */
export function isMvpMockMode(): boolean {
  // Never allow auth bypass on Vercel production.
  if (process.env.VERCEL_ENV === 'production') return false;

  return (
    process.env.NEXT_PUBLIC_MVP_MOCK === '1' ||
    process.env.NEXT_PUBLIC_PREVIEW === '1' ||
    process.env.PREVIEW_MODE === '1'
  );
}

/** Client-safe mock flag (NEXT_PUBLIC_* only). */
export function isMvpMockModeClient(): boolean {
  // Mirror server: production builds never advertise mock UI chrome.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return false;
  if (process.env.VERCEL_ENV === 'production') return false;

  return (
    process.env.NEXT_PUBLIC_MVP_MOCK === '1' ||
    process.env.NEXT_PUBLIC_PREVIEW === '1'
  );
}
