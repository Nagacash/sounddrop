import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { upsertArtist, getArtist } from '@/lib/db';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';

export async function POST(req: NextRequest) {
  const mock = isMvpMockMode();
  let userId: string | null = null;

  if (!mock) {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (process.env.CLERK_SECRET_KEY) {
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const me = await client.users.getUser(userId);
      if (me.banned) {
        return NextResponse.json({ error: 'account_banned', code: 'ACCOUNT_BANNED' }, { status: 403 });
      }
    }
  }

  const body = await req.json().catch(() => ({}));
  const publicKey = body.publicKey;
  if (!publicKey || typeof publicKey !== 'string') {
    return NextResponse.json({ error: 'publicKey required' }, { status: 400 });
  }

  let resolvedUserId = userId!;
  if (mock) {
    try {
      resolvedUserId = await hashPublicKey(publicKey);
    } catch {
      return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
    }
  }

  const artist = await upsertArtist({
    user_id: resolvedUserId,
    email: body.email || '',
    display_name: body.displayName || '',
    public_key: publicKey,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, artist, publicKeyHash: resolvedUserId });
}

export async function GET() {
  const mock = isMvpMockMode();
  if (mock) {
    return NextResponse.json({ artist: null, mock: true });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const artist = await getArtist(userId);
  return NextResponse.json({ artist });
}
