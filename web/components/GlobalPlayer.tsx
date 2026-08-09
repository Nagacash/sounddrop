'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { formatTime } from '@/lib/utils';

export default function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedId = useRef<string | null>(null);
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
  } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (!currentTrack.storageUrl) {
      setIsPlaying(false);
      return;
    }

    if (loadedId.current !== currentTrack.id) {
      audio.pause();
      audio.src = currentTrack.storageUrl;
      audio.load();
      loadedId.current = currentTrack.id;
    }

    if (isPlaying) {
      const tryPlay = () => {
        void audio.play().catch(() => setIsPlaying(false));
      };
      if (audio.readyState >= 2) tryPlay();
      else {
        const onReady = () => {
          audio.removeEventListener('canplay', onReady);
          tryPlay();
        };
        audio.addEventListener('canplay', onReady);
        return () => audio.removeEventListener('canplay', onReady);
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, setIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  return (
    <>
      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {currentTrack && (
        <div className="fixed inset-x-0 bottom-0 z-modal border-t border-white/10 bg-sd-bg/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-8">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center bg-sd-accent text-white transition-colors duration-200 hover:bg-[#ff2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
              <p className="truncate text-xs text-white/45">{currentTrack.artistName}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-10 shrink-0 text-[11px] tabular-nums text-white/40">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.duration || 1}
                  value={Math.min(currentTime, duration || currentTrack.duration || 0)}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setCurrentTime(t);
                    if (audioRef.current) audioRef.current.currentTime = t;
                  }}
                  className="h-1 flex-1 cursor-pointer appearance-none bg-white/15 accent-sd-accent"
                  aria-label="Seek"
                />
                <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-white/40">
                  {formatTime(duration || currentTrack.duration)}
                </span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="hidden h-1 w-24 cursor-pointer appearance-none bg-white/15 accent-sd-accent sm:block"
              aria-label="Volume"
            />
          </div>
        </div>
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
    </svg>
  );
}
