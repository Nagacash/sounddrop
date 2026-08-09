import { NextRequest, NextResponse } from 'next/server';
import { adminEmailOf, getAdminClerkClient, logAdminAction, requireAdmin } from '@/lib/admin';
import { deleteArtist } from '@/lib/db';

type Props = { params: Promise<{ userId: string }> };

/**
 * DELETE — permanently remove a Clerk user (ToS / abuse).
 * Body: { confirm: "DELETE", reason?: string }
 * IRREVERSIBLE: sessions, memberships, and identity are destroyed.
 */
export async function DELETE(req: NextRequest, { params }: Props) {
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
      return NextResponse.json({ error: 'cannot delete yourself' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'confirmation required', hint: 'Send { "confirm": "DELETE" }' },
        { status: 400 },
      );
    }
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Account deleted for policy violation';

    const client = await getAdminClerkClient();
    await client.users.deleteUser(userId);
    await deleteArtist(userId);

    await logAdminAction({
      adminId: admin.id,
      adminEmail: adminEmailOf(admin),
      action: 'user.delete',
      targetType: 'user',
      targetId: userId,
      detail: reason,
    });

    return NextResponse.json({ ok: true, deleted: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'delete_failed';
    console.error('[admin/users/delete]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
