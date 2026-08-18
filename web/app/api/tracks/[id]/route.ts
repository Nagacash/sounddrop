import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteAudio } from '@/lib/audioStorage';
import { getTrack, hardDeleteTrack, updateTrackMeta } from '@/lib/db';
import { isMvpMockMode } from '@/lib/mockMode';
import { hashPublicKey } from '@/lib/publicKeyHash';

type Props = { params: Promise<{ id: string }> };

async function assertTrackOwner(
  track: NonNullable<Awaited<ReturnType<typeof getTrack>>>,
  opts: { mock: boolean; publicKey?: string },
): Promise<NextResponse | null> {
  if (!opts.mock) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (track.artist_id !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return null;
  }

  const publicKey = opts.publicKey || '';
  if (!publicKey) return NextResponse.json({ error: 'publicKey required' }, { status: 400 });
  try {
    const hash = await hashPublicKey(publicKey);
    if (track.artist_id !== hash) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid publicKey' }, { status: 400 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const mock = isMvpMockMode();
  const body = await req.json().catch(() => ({}));

  const track = await getTrack(id);
  if (!track || track.removed_at) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const denied = await assertTrackOwner(track, {
    mock,
    publicKey: typeof body.publicKey === 'string' ? body.publicKey : undefined,
  });
  if (denied) return denied;

  const updated = await updateTrackMeta(id, {
    title: typeof body.title === 'string' ? body.title.slice(0, 120) : undefined,
    producers: typeof body.producers === 'string' ? body.producers.slice(0, 200) : undefined,
    featuring: typeof body.featuring === 'string' ? body.featuring.slice(0, 200) : undefined,
  });

  return NextResponse.json({ ok: true, track: updated });
}

/** Artist-owned hard delete: removes catalog row + stored audio. */
export async function DELETE(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const mock = isMvpMockMode();
  const body = await req.json().catch(() => ({}));

  const track = await getTrack(id);
  if (!track) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const denied = await assertTrackOwner(track, {
    mock,
    publicKey: typeof body.publicKey === 'string' ? body.publicKey : undefined,
  });
  if (denied) return denied;

  await deleteAudio(track.cid);
  const ok = await hardDeleteTrack(id);
  if (!ok) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: id });
}
