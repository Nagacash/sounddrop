import { NextRequest, NextResponse } from 'next/server';
import { adminEmailOf, logAdminAction, requireAdmin } from '@/lib/admin';
import { hardDeleteTrack, removeTrack, restoreTrack } from '@/lib/db';

type Props = { params: Promise<{ trackId: string }> };

/**
 * POST { action: "takedown" | "restore" | "purge", reason?: string }
 * takedown = soft-remove from catalog; purge = hard delete row.
 */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { trackId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const reason = typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim()
      : 'ToS / policy violation';

    if (!['takedown', 'restore', 'purge'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    if (action === 'takedown') {
      const track = await removeTrack(trackId, reason);
      if (!track) return NextResponse.json({ error: 'not found' }, { status: 404 });
      await logAdminAction({
        adminId: admin.id,
        adminEmail: adminEmailOf(admin),
        action: 'track.takedown',
        targetType: 'track',
        targetId: trackId,
        detail: reason,
      });
      return NextResponse.json({ ok: true, track });
    }

    if (action === 'restore') {
      const track = await restoreTrack(trackId);
      if (!track) return NextResponse.json({ error: 'not found' }, { status: 404 });
      await logAdminAction({
        adminId: admin.id,
        adminEmail: adminEmailOf(admin),
        action: 'track.restore',
        targetType: 'track',
        targetId: trackId,
        detail: 'restored to catalog',
      });
      return NextResponse.json({ ok: true, track });
    }

    // purge
    const ok = await hardDeleteTrack(trackId);
    if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
    await logAdminAction({
      adminId: admin.id,
      adminEmail: adminEmailOf(admin),
      action: 'track.purge',
      targetType: 'track',
      targetId: trackId,
      detail: reason,
    });
    return NextResponse.json({ ok: true, purged: trackId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'track_action_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
