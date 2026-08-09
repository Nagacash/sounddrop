'use client';

import type { ReactNode } from 'react';
import type { ArtistLinks } from '@/stores/artistStore';

interface ArtistSocialLinksProps {
  links?: ArtistLinks;
  className?: string;
}

const ITEMS: Array<{
  key: keyof ArtistLinks;
  label: string;
  icon: ReactNode;
}> = [
  { key: 'website', label: 'Website', icon: <WebIcon /> },
  { key: 'spotify', label: 'Spotify', icon: <SpotifyIcon /> },
  { key: 'instagram', label: 'Instagram', icon: <InstagramIcon /> },
];

export default function ArtistSocialLinks({ links, className = '' }: ArtistSocialLinksProps) {
  if (!links) return null;
  const present = ITEMS.filter((item) => Boolean(links[item.key]));
  if (!present.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {present.map((item) => (
        <a
          key={item.key}
          href={links[item.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors duration-200 hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
          aria-label={`Open ${item.label}`}
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </div>
  );
}

function WebIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9S14.5 18.2 12 21c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.75.75 0 01-1.03.25c-2.82-1.72-6.38-2.11-10.57-1.16a.75.75 0 11-.33-1.46c4.56-1.03 8.5-.59 11.68 1.35.35.21.46.66.25 1.02zm1.38-3.07a.9.9 0 01-1.24.3c-3.23-1.98-8.15-2.56-11.97-1.4a.9.9 0 11-.52-1.72c4.3-1.3 9.7-.66 13.43 1.62.42.26.56.82.3 1.2zm.12-3.2c-3.87-2.3-10.26-2.51-13.96-1.39a1.05 1.05 0 11-.61-2.01c4.24-1.28 11.24-1.03 15.68 1.6a1.05 1.05 0 11-1.11 1.8z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="0" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
