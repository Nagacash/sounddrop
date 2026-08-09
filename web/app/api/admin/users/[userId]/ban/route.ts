import { NextRequest, NextResponse } from 'next/server';
import { adminEmailOf, getAdminClerkClient, logAdminAction, requireAdmin } from '@/lib/admin';

type Props = { params: Promise<{ userId: string }> };

/** POST { action: "ban" | "unban", reason?: string } */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (userId === admin.id) {
      return NextResponse.json({ error: 'cannot ban yourself' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'unban' ? 'unban' : 'ban';
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Terms of service violation';

    const client = await getAdminClerkClient();
    if (action === 'ban') {
      await client.users.banUser(userId);
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          banReason: reason,
          bannedAt: new Date().toISOString(),
          bannedBy: admin.id,
        },
      });
    } else {
      await client.users.unbanUser(userId);
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          banReason: null,
          bannedAt: null,
          bannedBy: null,
          unbannedAt: new Date().toISOString(),
        },
      });
    }

    await logAdminAction({
      adminId: admin.id,
      adminEmail: adminEmailOf(admin),
      action: action === 'ban' ? 'user.ban' : 'user.unban',
      targetType: 'user',
      targetId: userId,
      detail: reason,
    });

    return NextResponse.json({ ok: true, userId, action, reason });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ban_failed';
    console.error('[admin/users/ban]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
