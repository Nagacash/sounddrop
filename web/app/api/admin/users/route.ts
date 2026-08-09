import { NextResponse } from 'next/server';
import { listUsersForAdmin, requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const users = await listUsersForAdmin(100);
    return NextResponse.json({
      users,
      adminId: admin.id,
      count: users.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'list_failed';
    console.error('[admin/users]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
