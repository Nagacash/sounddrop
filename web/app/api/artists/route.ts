import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { upsertArtist, getArtist, listTracksForArtist } from '@/lib/db';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';
import { normalizeProfileUrl } from '@/lib/profileLinks';

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

  const bio =
    typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : undefined;

  const website_url =
    body.websiteUrl !== undefined ? normalizeProfileUrl(body.websiteUrl) : undefined;
  const spotify_url =
    body.spotifyUrl !== undefined ? normalizeProfileUrl(body.spotifyUrl) : undefined;
  const instagram_url =
    body.instagramUrl !== undefined ? normalizeProfileUrl(body.instagramUrl) : undefined;
  const bandcamp_url =
    body.bandcampUrl !== undefined ? normalizeProfileUrl(body.bandcampUrl) : undefined;
  const location =
    body.location !== undefined
      ? String(body.location || '')
          .trim()
          .slice(0, 80)
      : undefined;

  const artist = await upsertArtist({
    user_id: resolvedUserId,
    email: body.email || '',
    display_name: body.displayName || '',
    bio,
    website_url,
    spotify_url,
    instagram_url,
    bandcamp_url,
    location,
    public_key: publicKey,
    created_at: new Date().toISOString(),
  });

  let publicKeyHash: string;
  try {
    publicKeyHash = await hashPublicKey(publicKey);
  } catch {
    return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    artist,
    publicKeyHash,
    slug: artist.slug,
  });
}

export async function GET() {
  const mock = isMvpMockMode();
  if (mock) {
    return NextResponse.json({ artist: null, mock: true });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const artist = await getArtist(userId);
  const tracks = artist ? await listTracksForArtist(userId) : [];
  return NextResponse.json({ artist, tracks });
}
