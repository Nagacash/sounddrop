import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { appendAudit } from '@/lib/db';

export type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: number;
  lastSignInAt: number | null;
};

export function isAdminMetadata(meta: Record<string, unknown> | null | undefined): boolean {
  return meta?.role === 'admin';
}

/** Server-side admin gate. Returns the admin user or null. */
export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user || !isAdminMetadata(user.publicMetadata as Record<string, unknown>)) {
    return null;
  }
  return user;
}

function getBackendClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured');
  }
  return createClerkClient({ secretKey });
}

export async function getAdminClerkClient() {
  try {
    return await clerkClient();
  } catch {
    return getBackendClient();
  }
}

export async function listUsersForAdmin(limit = 50): Promise<AdminUser[]> {
  const client = getBackendClient();
  const res = await client.users.getUserList({ limit, orderBy: '-created_at' });
  const rows = Array.isArray(res) ? res : (res.data ?? []);
  return rows.map((u) => {
    const priv = (u.privateMetadata || {}) as Record<string, unknown>;
    return {
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? '',
      firstName: u.firstName,
      lastName: u.lastName,
      imageUrl: u.imageUrl,
      role: (u.publicMetadata?.role as string | undefined) ?? null,
      banned: u.banned,
      banReason: typeof priv.banReason === 'string' ? priv.banReason : null,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    };
  });
}

export async function logAdminAction(opts: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'track' | 'system';
  targetId: string;
  detail: string;
}) {
  return appendAudit({
    admin_id: opts.adminId,
    admin_email: opts.adminEmail,
    action: opts.action,
    target_type: opts.targetType,
    target_id: opts.targetId,
    detail: opts.detail,
  });
}

export function adminEmailOf(user: { primaryEmailAddress?: { emailAddress?: string | null } | null; emailAddresses?: { emailAddress: string }[] }) {
  return (
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    'unknown'
  );
}
