'use client';

import Image from 'next/image';

interface ArtistAvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
}

const SIZES = {
  xs: 'h-5 w-5 text-[0.55rem]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-16 w-16 text-sm',
  lg: 'h-24 w-24 text-xl sm:h-28 sm:w-28 sm:text-2xl',
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

/** Small circular profile photo — never used as track/beat artwork. */
export default function ArtistAvatar({
  src,
  name,
  size = 'md',
  className = '',
  priority = false,
}: ArtistAvatarProps) {
  const dim = size === 'xs' ? 20 : size === 'sm' ? 40 : size === 'md' ? 64 : 112;
  const hasPhoto = Boolean(src?.trim());

  return (
    <div
      className={`sd-avatar relative shrink-0 overflow-hidden border border-sd-border bg-sd-surface ${SIZES[size]} ${className}`}
      aria-hidden={!hasPhoto}
    >
      {hasPhoto ? (
        <Image
          src={src!}
          alt={name}
          width={dim}
          height={dim}
          priority={priority}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-telemetry font-bold text-sd-muted">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/** Neutral beat tile — not the artist avatar. */
export function BeatArtPlaceholder({
  title,
  className = '',
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center border border-sd-border bg-sd-bg ${className}`}
      aria-hidden
    >
      <span className="font-telemetry text-[0.65rem] tracking-widest text-sd-muted">
        {title ? 'MP3' : 'BEAT'}
      </span>
    </div>
  );
}
