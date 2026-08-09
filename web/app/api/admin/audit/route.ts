import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { listAudit } from '@/lib/db';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const events = await listAudit(200);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'audit_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
