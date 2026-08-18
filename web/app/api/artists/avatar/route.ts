import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getArtist } from '@/lib/db';
import { storeArtistAvatar } from '@/lib/avatarStorage';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';
import { AVATAR_MAX_BYTES, AVATAR_MIME } from '@/lib/mediaLimits';

export async function POST(req: NextRequest) {
  const mock = isMvpMockMode();
  const form = await req.formData();
  const file = form.get('file');
  const publicKey = form.get('publicKey');

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  let userId: string | null = null;
  if (!mock) {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  } else {
    if (typeof publicKey !== 'string' || !publicKey) {
      return NextResponse.json({ error: 'publicKey required' }, { status: 400 });
    }
    try {
      userId = await hashPublicKey(publicKey);
    } catch {
      return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
    }
  }

  const artist = await getArtist(userId!);
  if (!artist) {
    return NextResponse.json(
      { error: 'register_artist_first', detail: 'Save profile before uploading an image.' },
      { status: 400 },
    );
  }

  const type = file.type || 'image/jpeg';
  if (!AVATAR_MIME.has(type) && !type.startsWith('image/')) {
    return NextResponse.json({ error: 'image_only' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      {
        error: 'avatar_too_large',
        detail: `Max ${Math.round(AVATAR_MAX_BYTES / 1024)}KB after compression`,
      },
      { status: 413 },
    );
  }

  try {
    const url = await storeArtistAvatar(userId!, buf, type.startsWith('image/') ? type : 'image/jpeg');
    return NextResponse.json({ ok: true, profileImageUrl: url, bytes: buf.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'store_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
