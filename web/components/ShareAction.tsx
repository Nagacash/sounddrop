'use client';

import { useState } from 'react';
import { shareOrCopy } from '@/lib/utils';

interface ShareActionProps {
  url: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export default function ShareAction({
  url,
  title,
  text,
  label = 'Share',
  className = '',
  compact = false,
}: ShareActionProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const onShare = async () => {
    const result = await shareOrCopy({ url, title, text });
    if (result === 'shared') {
      setStatus('shared');
    } else if (result === 'copied') {
      setStatus('copied');
    }
    if (result !== 'failed') {
      window.setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const display =
    status === 'copied' ? 'Link copied' : status === 'shared' ? 'Shared' : label;

  return (
    <button
      type="button"
      onClick={onShare}
      className={
        className ||
        (compact
          ? 'inline-flex min-h-11 cursor-pointer items-center text-sm text-white/55 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent'
          : 'inline-flex min-h-12 cursor-pointer items-center justify-center border border-white/40 px-7 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent')
      }
      aria-label={`Share ${title}`}
    >
      {compact ? (
        <span className="inline-flex items-center gap-1.5">
          <ShareIcon />
          {display}
        </span>
      ) : (
        display
      )}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
    </svg>
  );
}
