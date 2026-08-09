import { NextResponse } from 'next/server';
import { requireAdmin, listUsersForAdmin } from '@/lib/admin';
import { adminStats, listArtists } from '@/lib/db';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const [stats, users, artists] = await Promise.all([
      adminStats(),
      listUsersForAdmin(100),
      listArtists(),
    ]);

    return NextResponse.json({
      stats: {
        ...stats,
        clerkUsers: users.length,
        bannedUsers: users.filter((u) => u.banned).length,
        registeredArtists: artists.length,
      },
      adminId: admin.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'overview_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
