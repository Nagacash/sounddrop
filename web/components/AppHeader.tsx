'use client';

import Link from 'next/link';
import Image from 'next/image';
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

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <Image
        src="/logo.png"
        alt=""
        width={compact ? 28 : 36}
        height={compact ? 28 : 36}
        className="h-7 w-7 object-contain sm:h-9 sm:w-9"
        priority
        unoptimized
      />
      <span className={compact ? 'tracking-[0.18em]' : 'font-display text-xl sm:text-2xl'}>
        SOUNDDROP
      </span>
    </>
  );
}

export default function AppHeader({ mock }: { mock: boolean }) {
  const pathname = usePathname() || '/';

  if (isArtistSpacePath(pathname)) {
    return (
      <div className="pointer-events-none fixed left-0 top-0 z-header p-5 sm:p-6">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 text-[11px] font-semibold text-white/55 transition-colors duration-200 hover:text-white"
        >
          <BrandMark compact />
        </Link>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-header border-b border-sd-border bg-sd-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 border-r border-sd-border px-4 py-3 text-sd-text sm:gap-3 sm:px-5 sm:py-4"
        >
          <BrandMark />
        </Link>
        <nav className="font-telemetry flex flex-1 flex-wrap items-center gap-1 px-2 text-xs text-sd-muted sm:gap-0">
          <Link
            href="/"
            className="px-3 py-3.5 transition-colors duration-fast ease-out hover:text-sd-text"
          >
            [ DISCOVER ]
          </Link>
          {mock ? (
            <Link
              href="/artist/setup"
              className="px-3 py-3.5 transition-colors duration-fast ease-out hover:text-sd-text"
            >
              [ DASHBOARD ]
            </Link>
          ) : (
            <Show when="signed-in">
              <Link
                href="/artist/setup"
                className="px-3 py-3.5 transition-colors duration-fast ease-out hover:text-sd-text"
              >
                [ DASHBOARD ]
              </Link>
            </Show>
          )}
          <Link
            href="/policy/content-responsibility"
            className="px-3 py-3.5 transition-colors duration-fast ease-out hover:text-sd-text"
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
