import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { verifyIngest } from '@/lib/ingest';
import { checkAudioFingerprint } from '@/lib/audd';
import { getArtist, insertTrack, listTracks, upsertArtist } from '@/lib/db';
import { storeAudio } from '@/lib/audioStorage';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';
import { AUDIO_MAX_BYTES } from '@/lib/mediaLimits';

function isMp3(file: Blob, name: string) {
  return file.type === 'audio/mpeg' || name.toLowerCase().endsWith('.mp3');
}

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
        return NextResponse.json(
          { error: 'account_banned', code: 'ACCOUNT_BANNED' },
          { status: 403 },
        );
      }
    }
  }

  const form = await req.formData();
  const file = form.get('file');
  const metaRaw = form.get('meta');
  const signature = form.get('signature');
  const publicKey = form.get('publicKey');
  const artistDisplayName = (form.get('artistDisplayName') as string) || 'Artist';
  const titleOverride =
    typeof form.get('title') === 'string' ? String(form.get('title')).trim() : '';
  const producers =
    typeof form.get('producers') === 'string' ? String(form.get('producers')).trim().slice(0, 200) : '';
  const featuring =
    typeof form.get('featuring') === 'string' ? String(form.get('featuring')).trim().slice(0, 200) : '';

  if (
    !(file instanceof Blob) ||
    typeof metaRaw !== 'string' ||
    typeof signature !== 'string' ||
    typeof publicKey !== 'string'
  ) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const fileName = file instanceof File ? file.name : 'track.mp3';
  if (!isMp3(file, fileName)) {
    return NextResponse.json(
      { error: 'Only MP3 files are supported. Please upload an MP3 file.' },
      { status: 400 },
    );
  }
  if (file.size > AUDIO_MAX_BYTES) {
    return NextResponse.json(
      {
        error: 'file_too_large',
        detail: `MP3 must be under ${Math.round(AUDIO_MAX_BYTES / (1024 * 1024))}MB`,
      },
      { status: 413 },
    );
  }

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ error: 'invalid meta json' }, { status: 400 });
  }
  if (!meta || typeof meta !== 'object') {
    return NextResponse.json({ error: 'invalid meta' }, { status: 400 });
  }
  const audioBuffer = await file.arrayBuffer();

  let registeredPublicKey = publicKey;
  if (!mock && userId) {
    let artist = await getArtist(userId);
    // Auto-register on first upload so users aren't blocked if they skipped
    // "Register public key", or if a prior register was lost (ephemeral FS).
    if (!artist) {
      artist = await upsertArtist({
        user_id: userId,
        email: '',
        display_name: artistDisplayName || 'Artist',
        public_key: publicKey,
        created_at: new Date().toISOString(),
      });
    }
    registeredPublicKey = artist.public_key;
  }

  const { ok, problems, realCid } = await verifyIngest({
    meta,
    signature,
    publicKey,
    audioBuffer,
    registeredPublicKey,
  });
  if (!ok) {
    const status = problems.includes('signature_invalid') ? 401 : 403;
    return NextResponse.json({ error: problems.join(', '), problems }, { status });
  }
  if (!realCid) {
    return NextResponse.json({ error: 'cid_missing', problems: ['cid_missing'] }, { status: 403 });
  }

  const fingerprintResult = await checkAudioFingerprint(
    Buffer.from(audioBuffer),
    artistDisplayName,
  );

  if (!fingerprintResult.canProceed) {
    return NextResponse.json(
      {
        error: fingerprintResult.reason,
        matchedTrack: fingerprintResult.matchedTrack,
        code: 'COPYRIGHT_DETECTED',
      },
      { status: 422 },
    );
  }

  let artistId = userId!;
  let publicKeyHash: string;
  try {
    publicKeyHash = await hashPublicKey(publicKey);
  } catch {
    return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
  }
  if (mock) {
    artistId = publicKeyHash;
  }

  let storageUrl: string;
  try {
    storageUrl = await storeAudio(realCid, audioBuffer);
  } catch (err) {
    console.error('[tracks] audio store failed', err);
    return NextResponse.json(
      {
        error: 'audio_store_failed',
        detail:
          err instanceof Error
            ? err.message
            : 'Could not store MP3. Check SUPABASE_SECRET_KEY on Vercel.',
      },
      { status: 500 },
    );
  }

  const displayTitle =
    titleOverride ||
    (typeof meta.title === 'string' ? meta.title.trim() : '') ||
    String(meta.name).replace(/\.mp3$/i, '');

  const track = await insertTrack({
    id: realCid,
    artist_id: artistId,
    title: displayTitle.slice(0, 120),
    name: String(meta.name),
    size: Number(meta.size),
    type: typeof meta.type === 'string' ? meta.type : 'audio/mpeg',
    cid: realCid,
    signature,
    public_key: publicKey,
    storage_url: storageUrl,
    producers: producers || null,
    featuring: featuring || null,
    created_at: new Date().toISOString(),
  });

  const artistRow = await getArtist(artistId);

  return NextResponse.json({
    success: true,
    trackId: track.id,
    ok: true,
    track,
    publicKeyHash,
    slug: artistRow?.slug || publicKeyHash,
    warning: fingerprintResult.isDuplicate ? fingerprintResult.reason : undefined,
  });
}

export async function GET() {
  // Public catalog omits admin-removed tracks.
  const tracks = await listTracks({ includeRemoved: false });
  return NextResponse.json({ tracks });
}
