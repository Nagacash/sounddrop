'use client';

import { useState } from 'react';
import { copyToClipboard, shareOrCopy } from '@/lib/utils';

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

  const onCopyLink = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const display =
    status === 'copied' ? 'Link copied' : status === 'shared' ? 'Shared' : label;

  return (
    <div className="inline-flex items-center gap-2">
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

      <button
        type="button"
        onClick={onCopyLink}
        className={
          compact
            ? 'inline-flex min-h-11 cursor-pointer items-center text-xs text-white/40 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent'
            : 'inline-flex min-h-12 cursor-pointer items-center justify-center border border-sd-border bg-transparent px-4 text-xs font-bold uppercase tracking-[0.08em] text-sd-muted transition-colors duration-200 hover:border-sd-text hover:text-sd-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent'
        }
        title="Copy direct link to clipboard"
        aria-label="Copy link"
      >
        <span className="inline-flex items-center gap-1">
          <CopyIcon />
          {status === 'copied' ? 'Copied!' : 'Copy Link'}
        </span>
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" />
    </svg>
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
