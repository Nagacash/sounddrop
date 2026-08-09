/** MVP mock mode: Clerk optional; browse/play/upload without auth. */
export function isMvpMockMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_MVP_MOCK === '1' ||
    process.env.NEXT_PUBLIC_PREVIEW === '1' ||
    process.env.PREVIEW_MODE === '1'
  );
}

/** Client-safe mock flag (NEXT_PUBLIC_* only). */
export function isMvpMockModeClient(): boolean {
  return (
    process.env.NEXT_PUBLIC_MVP_MOCK === '1' ||
    process.env.NEXT_PUBLIC_PREVIEW === '1'
  );
}
