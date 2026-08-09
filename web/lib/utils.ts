export function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPriceCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function appOrigin(origin?: string): string {
  return origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
}

export function artistShareUrl(publicKeyHash: string, origin?: string): string {
  return `${appOrigin(origin)}/artist/${publicKeyHash}`;
}

export function trackShareUrl(publicKeyHash: string, trackId: string, origin?: string): string {
  return `${appOrigin(origin)}/artist/${publicKeyHash}/track/${trackId}`;
}

export async function shareOrCopy(opts: {
  url: string;
  title: string;
  text?: string;
}): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return 'shared';
    } catch (err) {
      // User dismissed sheet — not a failure worth falling back noisily.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }
  const ok = await copyToClipboard(opts.url);
  return ok ? 'copied' : 'failed';
}
