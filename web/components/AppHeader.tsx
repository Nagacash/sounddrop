'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
import AdminNavLink from '@/components/AdminNavLink';

/** Public artist storefronts — fan view: no upload / dashboard chrome. */
export function isArtistSpacePath(pathname: string) {
  // /artist/setup is the dashboard; everything else under /artist/:slug is public.
  if (!pathname.startsWith('/artist/')) return false;
  if (pathname === '/artist/setup' || pathname.startsWith('/artist/setup/')) return false;
  return pathname.length > '/artist/'.length;
}

export default function AppHeader({ mock }: { mock: boolean }) {
  const pathname = usePathname() || '/';

  if (isArtistSpacePath(pathname)) {
    return (
      <div className="pointer-events-none fixed left-0 top-0 z-header p-5 sm:p-6">
        <Link
          href="/"
          className="pointer-events-auto text-[11px] font-semibold tracking-[0.18em] text-white/55 transition-colors duration-200 hover:text-white"
        >
          SOUNDDROP
        </Link>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-header border-b border-sd-border bg-sd-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-0">
        <Link
          href="/"
          className="font-display flex items-center border-r border-sd-border px-5 py-4 text-xl text-sd-text sm:text-2xl"
        >
          SOUNDDROP
        </Link>
        <nav className="font-telemetry flex flex-1 flex-wrap items-center gap-1 px-2 text-[11px] text-sd-muted sm:gap-0">
          <Link
            href="/"
            className="px-3 py-3 transition-colors duration-fast ease-out hover:text-sd-text"
          >
            [ DISCOVER ]
          </Link>
          {mock ? (
            <Link
              href="/artist/setup"
              className="px-3 py-3 transition-colors duration-fast ease-out hover:text-sd-text"
            >
              [ DASHBOARD ]
            </Link>
          ) : (
            <Show when="signed-in">
              <Link
                href="/artist/setup"
                className="px-3 py-3 transition-colors duration-fast ease-out hover:text-sd-text"
              >
                [ DASHBOARD ]
              </Link>
            </Show>
          )}
          <Link
            href="/policy/content-responsibility"
            className="px-3 py-3 transition-colors duration-fast ease-out hover:text-sd-text"
          >
            [ POLICY ]
          </Link>
          {!mock && <AdminNavLink />}
        </nav>
        <div className="font-telemetry flex items-center gap-2 border-l border-sd-border px-4 text-[10px]">
          {!mock && (
            <>
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </>
          )}
          {mock && <span className="text-sd-status">[ MVP / MOCK ]</span>}
        </div>
      </div>
      <div className="sd-rule w-full" aria-hidden />
    </header>
  );
}
