'use client';

import ShareAction from '@/components/ShareAction';
import { trackShareUrl } from '@/lib/utils';

interface ShareButtonProps {
  trackId: string;
  publicKeyHash: string;
  compact?: boolean;
  title?: string;
  artistName?: string;
}

/** Back-compat share control for tracks — uses native share / copy. */
export default function ShareButton({
  trackId,
  publicKeyHash,
  compact,
  title = 'SoundDrop track',
  artistName,
}: ShareButtonProps) {
  const url = trackShareUrl(publicKeyHash, trackId);
  return (
    <ShareAction
      url={url}
      title={title}
      text={
        artistName
          ? `Play ${title} by ${artistName} on SoundDrop.`
          : `Play on SoundDrop — artist-owned music.`
      }
      label={compact ? 'Share' : 'Share track'}
      compact={compact}
      className={
        compact
          ? undefined
          : 'sd-btn-ghost w-full cursor-pointer'
      }
    />
  );
}
