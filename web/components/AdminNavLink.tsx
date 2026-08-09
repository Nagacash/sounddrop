'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

/** Shown only when Clerk publicMetadata.role === 'admin'. */
export default function AdminNavLink() {
  const { user, isLoaded } = useUser();
  if (!isLoaded || user?.publicMetadata?.role !== 'admin') return null;

  return (
    <Link
      href="/admin"
      className="px-3 py-3 text-sd-accent transition-colors duration-fast ease-out hover:text-sd-text"
    >
      [ ADMIN ]
    </Link>
  );
}
