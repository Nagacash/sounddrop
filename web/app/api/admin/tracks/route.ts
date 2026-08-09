import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { listTracks, listArtists } from '@/lib/db';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const [tracks, artists] = await Promise.all([
      listTracks({ includeRemoved: true }),
      listArtists(),
    ]);
    const artistMap = Object.fromEntries(artists.map((a) => [a.user_id, a]));

    return NextResponse.json({
      tracks: tracks.map((t) => ({
        ...t,
        artist_display_name: artistMap[t.artist_id]?.display_name || t.artist_id,
        artist_email: artistMap[t.artist_id]?.email || '',
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'tracks_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
