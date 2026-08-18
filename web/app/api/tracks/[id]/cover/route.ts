import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { storeCover } from '@/lib/coverStorage';
import { getTrack, updateTrackCoverUrl } from '@/lib/db';
import { COVER_MAX_BYTES, COVER_MIME } from '@/lib/mediaLimits';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';
import { takeRateLimit } from '@/lib/rateLimit';

type Props = { params: Promise<{ id: string }> };

function isUploadBlob(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).size === 'number'
  );
}

/** Upload / replace track cover artwork for an owned track. */
export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const mock = isMvpMockMode();
  const form = await req.formData();
  const file = form.get('cover') ?? form.get('file');
  const publicKey = form.get('publicKey');

  if (!isUploadBlob(file) || file.size <= 0) {
    return NextResponse.json({ error: 'cover required' }, { status: 400 });
  }

  const track = await getTrack(id);
  if (!track || track.removed_at) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!mock) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (track.artist_id !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } else {
    if (typeof publicKey !== 'string' || !publicKey) {
      return NextResponse.json({ error: 'publicKey required' }, { status: 400 });
    }
    try {
      const hash = await hashPublicKey(publicKey);
      if (track.artist_id !== hash) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
    }
  }

  const limited = takeRateLimit(`track-cover:post:${track.artist_id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: limited.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

  const coverName = file instanceof File ? file.name : 'cover.jpg';
  const coverType =
    file.type ||
    (coverName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : coverName.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg');

  if (!COVER_MIME.has(coverType) && !coverType.startsWith('image/')) {
    return NextResponse.json({ error: 'image_only' }, { status: 400 });
  }
  if (file.size > COVER_MAX_BYTES) {
    return NextResponse.json(
      {
        error: 'cover_too_large',
        detail: `Max ${Math.round(COVER_MAX_BYTES / 1024)}KB after compression`,
      },
      { status: 413 },
    );
  }

  try {
    const coverUrl = await storeCover(
      track.cid,
      await file.arrayBuffer(),
      coverType.startsWith('image/') ? coverType : 'image/jpeg',
    );
    const updated = await updateTrackCoverUrl(id, coverUrl);
    return NextResponse.json({
      ok: true,
      coverUrl,
      bytes: file.size,
      track: updated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'store_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
