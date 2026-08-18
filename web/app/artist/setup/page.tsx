'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { generateKeypair, signMeta, computeCID } from '@/lib/crypto';
import { compressAvatarFile } from '@/lib/compressAvatar';
import { isMvpMockModeClient } from '@/lib/mockMode';
import { AUDIO_MAX_BYTES } from '@/lib/mediaLimits';
import Image from 'next/image';

const POLICY_KEY = 'sd_policy_accepted_at';
const PROFILE_SLUG_KEY = 'sd_profile_slug';

type DashTrack = {
  id: string;
  title: string;
  producers?: string | null;
  featuring?: string | null;
  storage_url?: string | null;
};

const initialPriv = typeof window !== 'undefined' ? localStorage.getItem('sd_priv') || '' : '';
const initialPub = typeof window !== 'undefined' ? localStorage.getItem('sd_pub') || '' : '';
const initialProfileSlug =
  typeof window !== 'undefined' ? localStorage.getItem(PROFILE_SLUG_KEY) || '' : '';

export default function ArtistSetupPage() {
  const router = useRouter();
  const mock = isMvpMockModeClient();
  const clerk = useUser();
  const user = mock ? null : clerk.user ?? null;
  const isSignedIn = mock ? true : (clerk.isSignedIn ?? false);

  const [pubKey, setPubKey] = useState(initialPub);
  const [privKey, setPrivKey] = useState(initialPriv);
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [bandcampUrl, setBandcampUrl] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [producers, setProducers] = useState('');
  const [featuring, setFeaturing] = useState('');
  const [myTracks, setMyTracks] = useState<DashTrack[]>([]);
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [profileSlug, setProfileSlug] = useState(initialProfileSlug);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  function rememberProfileSlug(slug: string) {
    setProfileSlug(slug);
    localStorage.setItem(PROFILE_SLUG_KEY, slug);
  }

  function goToSpace(slug: string) {
    rememberProfileSlug(slug);
    router.push(`/artist/${slug}`);
  }

  async function loadMyTracks() {
    if (mock || !isSignedIn) return;
    try {
      const res = await fetch('/api/artists');
      if (!res.ok) return;
      const data = await res.json();
      setMyTracks(Array.isArray(data.tracks) ? data.tracks : []);
      const artist = data?.artist;
      if (artist?.slug) rememberProfileSlug(artist.slug);
      if (artist?.display_name && !displayName) setDisplayName(artist.display_name);
      if (artist?.bio && !bio) setBio(artist.bio);
      if (typeof artist?.location === 'string') setLocation(artist.location);
      if (typeof artist?.website_url === 'string') setWebsiteUrl(artist.website_url);
      if (typeof artist?.spotify_url === 'string') setSpotifyUrl(artist.spotify_url);
      if (typeof artist?.instagram_url === 'string') setInstagramUrl(artist.instagram_url);
      if (typeof artist?.bandcamp_url === 'string') setBandcampUrl(artist.bandcamp_url);
      if (typeof artist?.profile_image_url === 'string' && artist.profile_image_url) {
        setAvatarPreview(`${artist.profile_image_url}?v=${Date.now()}`);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (mock) {
      if (!profileSlug) {
        const legacy = localStorage.getItem('sd_profile_hash');
        if (legacy) rememberProfileSlug(legacy);
      }
      return;
    }
    if (!isSignedIn) return;
    void loadMyTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when signed in
  }, [isSignedIn, mock]);

  async function ensureKeys() {
    let pk = localStorage.getItem('sd_priv');
    let pb = localStorage.getItem('sd_pub');
    if (!pk || !pb) {
      const kp = await generateKeypair();
      pk = kp.privateKey;
      pb = kp.publicKey;
      localStorage.setItem('sd_priv', pk);
      localStorage.setItem('sd_pub', pb);
    }
    setPrivKey(pk);
    setPubKey(pb);
    return { pk, pb };
  }

  async function register(opts?: { quiet?: boolean }): Promise<boolean> {
    const quiet = opts?.quiet === true;
    const { pb } = await ensureKeys();
    if (!quiet) setStatus('[ REGISTERING PUBLIC KEY… ]');
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: pb,
        displayName: displayName || user?.fullName || 'Artist',
        bio: bio.trim(),
        location: location.trim(),
        websiteUrl: websiteUrl.trim(),
        spotifyUrl: spotifyUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        bandcampUrl: bandcampUrl.trim(),
        email: user?.primaryEmailAddress?.emailAddress || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`[ FAILED ] ${JSON.stringify(data)}`);
      return false;
    }
    const slug =
      (typeof data.slug === 'string' && data.slug) ||
      (typeof data.publicKeyHash === 'string' && data.publicKeyHash) ||
      '';
    if (slug) rememberProfileSlug(slug);
    if (!quiet) {
      setStatus('[ PUBLIC KEY REGISTERED ]');
    }
    return true;
  }

  async function upload() {
    if (!policyAccepted) {
      setStatus('[ ACCEPT CONTENT POLICY BEFORE UPLOAD ]');
      return;
    }
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setStatus('[ SELECT MP3 FILE ]');
      return;
    }
    if (f.type !== 'audio/mpeg' && !f.name.toLowerCase().endsWith('.mp3')) {
      setStatus('[ MP3 ONLY ]');
      return;
    }

    if (f.size > AUDIO_MAX_BYTES) {
      setStatus(`[ MP3 TOO LARGE ] Max ${Math.round(AUDIO_MAX_BYTES / (1024 * 1024))}MB`);
      return;
    }

    localStorage.setItem(POLICY_KEY, new Date().toISOString());

    const { pk, pb } = await ensureKeys();
    setStage('[ REGISTERING ARTIST ]');
    const registered = await register({ quiet: true });
    if (!registered) {
      setStage('');
      return;
    }

    setStage('[ READING FILE ]');
    const buf = await f.arrayBuffer();
    setStage('[ HASHING / CID ]');
    const cid = await computeCID(buf);
    const defaultTitle = f.name.replace(/\.mp3$/i, '');
    const meta = {
      name: f.name,
      size: f.size,
      type: f.type || 'audio/mpeg',
      cid,
      ts: new Date().toISOString(),
      title: trackTitle.trim() || defaultTitle,
    };
    setStage('[ SIGNING / ED25519 ]');
    const signature = await signMeta(meta, pk);
    setStage('[ UPLOADING / STORING AUDIO ]');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('meta', JSON.stringify(meta));
    fd.append('signature', signature);
    fd.append('publicKey', pb);
    fd.append('artistDisplayName', displayName || user?.fullName || 'Artist');
    fd.append('title', trackTitle.trim() || defaultTitle);
    fd.append('producers', producers.trim());
    fd.append('featuring', featuring.trim());
    const res = await fetch('/api/tracks', { method: 'POST', body: fd });
    const data = await res.json();
    setStage('');
    if (res.ok) {
      const slug =
        (typeof data.slug === 'string' && data.slug) ||
        (typeof data.publicKeyHash === 'string' && data.publicKeyHash) ||
        profileSlug;
      if (slug) rememberProfileSlug(slug);
      const warn = data.warning ? ` · ${data.warning}` : '';
      setStatus(`[ TRACK READY ] Re-upload fixed playback if needed.${warn}`);
      setTrackTitle('');
      setProducers('');
      setFeaturing('');
      if (fileRef.current) fileRef.current.value = '';
      await loadMyTracks();
      if (slug) {
        // Give a beat to see success, then open the space.
        window.setTimeout(() => goToSpace(slug), 600);
      }
    } else {
      setStatus(`[ REJECTED ] ${JSON.stringify(data)}`);
    }
  }

  async function saveTrack(track: DashTrack) {
    setSavingId(track.id);
    try {
      const res = await fetch(`/api/tracks/${encodeURIComponent(track.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: track.title,
          producers: track.producers || '',
          featuring: track.featuring || '',
          publicKey: pubKey || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`[ SAVE FAILED ] ${JSON.stringify(data)}`);
        return;
      }
      setStatus('[ TRACK UPDATED ]');
      await loadMyTracks();
    } finally {
      setSavingId('');
    }
  }

  async function deleteTrack(track: DashTrack) {
    const ok = window.confirm(
      `Delete “${track.title || 'this track'}” permanently?\n\nThis removes it from your space and deletes the audio file. This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(track.id);
    try {
      const res = await fetch(`/api/tracks/${encodeURIComponent(track.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubKey || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`[ DELETE FAILED ] ${JSON.stringify(data)}`);
        return;
      }
      setMyTracks((prev) => prev.filter((x) => x.id !== track.id));
      setStatus('[ TRACK DELETED ]');
    } finally {
      setDeletingId('');
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setStatus('[ COMPRESSING IMAGE… ]');
    try {
      await register({ quiet: true });
      const blob = await compressAvatarFile(file);
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      if (pubKey) fd.append('publicKey', pubKey);
      setStatus('[ UPLOADING IMAGE… ]');
      const res = await fetch('/api/artists/avatar', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`[ IMAGE FAILED ] ${JSON.stringify(data)}`);
        return;
      }
      const url =
        typeof data.profileImageUrl === 'string'
          ? `${data.profileImageUrl}?v=${Date.now()}`
          : '';
      if (url) setAvatarPreview(url);
      setStatus(
        `[ IMAGE SAVED ] ${Math.round((data.bytes || blob.size) / 1024)}KB (max ~150KB)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed';
      setStatus(`[ IMAGE FAILED ] ${msg}`);
    } finally {
      setAvatarBusy(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  }

  function handleRegisterClick() {
    void register();
  }

  function handleUploadClick() {
    void upload();
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void uploadAvatar(f);
  }

  if (!isSignedIn && !mock) {
    return (
      <main className="p-6">
        <p className="font-telemetry text-sm text-sd-muted">[ SIGN IN TO ACCESS ARTIST SETUP ]</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-40 pt-10 sm:pb-44">
      <p className="font-telemetry mb-2 text-[10px] text-sd-muted">UNIT / DASHBOARD · KEY LOCAL</p>
      <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-sd-text">ARTIST DASHBOARD</h1>
      <hr className="sd-rule my-4 max-w-[6rem]" />
      <p className="text-pretty text-sm text-sd-muted">
        Your private key stays in this browser. Only your public key is sent to the server.{' '}
        <Link href="/policy/content-responsibility" className="text-sd-accent underline-offset-2 hover:underline">
          Content policy
        </Link>
      </p>

      {profileSlug && (
        <div className="sd-panel mt-8 flex flex-wrap items-center justify-between gap-3 border border-sd-border p-5">
          <div>
            <p className="font-telemetry text-[11px] text-sd-muted">[ YOUR SPACE ]</p>
            <p className="mt-1 break-all font-telemetry text-[11px] text-sd-text">
              /artist/{profileSlug}
            </p>
          </div>
          <Link href={`/artist/${profileSlug}`} className="sd-btn">
            [ OPEN PROFILE ]
          </Link>
        </div>
      )}

      <section className="sd-panel mt-8 border border-sd-border p-5">
        <h2 className="font-telemetry text-[11px] text-sd-muted">[ DISPLAY NAME ]</h2>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your artist name"
          className="sd-input mt-3"
        />
        <h2 className="font-telemetry mt-6 text-[11px] text-sd-muted">[ BIO ]</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          placeholder="A short bio for your artist space"
          rows={4}
          className="sd-input mt-3 min-h-[6.5rem] resize-y"
        />
        <p className="font-telemetry mt-2 text-[10px] text-sd-muted">{bio.length}/500</p>

        <h2 className="font-telemetry mt-6 text-[11px] text-sd-muted">[ LOCATION ]</h2>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value.slice(0, 80))}
          placeholder="City or region (optional)"
          className="sd-input mt-3"
        />
        <p className="font-telemetry mt-2 text-[10px] text-sd-muted">{location.length}/80</p>

        <h2 className="font-telemetry mt-6 text-[11px] text-sd-muted">[ LINKS ]</h2>
        <p className="mt-2 text-xs text-sd-muted">
          Optional. Shown on your public profile. Leave blank to hide.
        </p>
        <label className="font-telemetry mt-4 block text-[10px] text-sd-muted">WEBSITE</label>
        <input
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value.slice(0, 500))}
          placeholder="https://yoursite.com"
          inputMode="url"
          autoComplete="url"
          className="sd-input mt-2"
        />
        <label className="font-telemetry mt-3 block text-[10px] text-sd-muted">BANDCAMP</label>
        <input
          value={bandcampUrl}
          onChange={(e) => setBandcampUrl(e.target.value.slice(0, 500))}
          placeholder="https://yourname.bandcamp.com"
          inputMode="url"
          className="sd-input mt-2"
        />
        <label className="font-telemetry mt-3 block text-[10px] text-sd-muted">SPOTIFY</label>
        <input
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value.slice(0, 500))}
          placeholder="https://open.spotify.com/artist/…"
          inputMode="url"
          className="sd-input mt-2"
        />
        <label className="font-telemetry mt-3 block text-[10px] text-sd-muted">INSTAGRAM</label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value.slice(0, 500))}
          placeholder="https://instagram.com/…"
          inputMode="url"
          className="sd-input mt-2"
        />

        <h2 className="font-telemetry mt-6 text-[11px] text-sd-muted">[ PROFILE PHOTO ]</h2>
        <p className="mt-2 text-xs text-sd-muted">
          Small circular avatar (Instagram-style). Not used as beat/cover art. Auto-compressed to
          ≤512px / ~100KB.
        </p>
        {avatarPreview && (
          <div className="sd-avatar relative mt-3 h-28 w-28 overflow-hidden border border-sd-border">
            <Image
              src={avatarPreview}
              alt="Profile"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        <input
          ref={avatarRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          onChange={handleAvatarPick}
          disabled={avatarBusy}
          className="font-telemetry mt-3 block w-full text-xs text-sd-muted file:mr-4 file:border file:border-sd-border file:bg-sd-bg file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-widest file:text-sd-text"
        />
      </section>

      <section className="sd-panel mt-px border border-sd-border p-5">
        <h2 className="font-telemetry text-[11px] text-sd-muted">[ ED25519 IDENTITY ]</h2>
        <p className="mt-3 break-all text-xs text-sd-muted">PUB: {pubKey || '—'}</p>
        <p className="break-all text-xs text-sd-muted">
          PRIV (LOCAL): {privKey ? `${privKey.slice(0, 24)}…` : '—'}
        </p>
        <button type="button" onClick={handleRegisterClick} className="sd-btn mt-4">
          [ SAVE PROFILE ]
        </button>
      </section>

      <section className="sd-panel mt-px border border-sd-border p-5">
        <h2 className="font-telemetry text-[11px] text-sd-muted">[ UPLOAD TRACK / MP3 ]</h2>
        <label className="mt-4 flex items-start gap-3 text-sm text-sd-muted">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 accent-sd-accent"
          />
          <span className="text-pretty">
            I certify that I own or have rights to all content I upload. I am solely responsible for
            copyright, licensing, and any disputes. SoundDrop is not liable.
          </span>
        </label>

        <label className="font-telemetry mt-5 block text-[10px] text-sd-muted" htmlFor="track-title">
          TRACK TITLE
        </label>
        <input
          id="track-title"
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value.slice(0, 120))}
          placeholder="Song name (rename before upload)"
          className="sd-input mt-2"
        />

        <label className="font-telemetry mt-4 block text-[10px] text-sd-muted" htmlFor="track-prod">
          PRODUCERS (OPTIONAL)
        </label>
        <input
          id="track-prod"
          value={producers}
          onChange={(e) => setProducers(e.target.value.slice(0, 200))}
          placeholder="e.g. Metro Boomin, Mike Dean"
          className="sd-input mt-2"
        />

        <label className="font-telemetry mt-4 block text-[10px] text-sd-muted" htmlFor="track-feat">
          FEATURING (OPTIONAL)
        </label>
        <input
          id="track-feat"
          value={featuring}
          onChange={(e) => setFeaturing(e.target.value.slice(0, 200))}
          placeholder="e.g. Guest Artist"
          className="sd-input mt-2"
        />

        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,.mp3"
          className="font-telemetry mt-4 block w-full text-xs text-sd-muted file:mr-4 file:border file:border-sd-border file:bg-sd-bg file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-widest file:text-sd-text"
        />
        <button type="button" onClick={handleUploadClick} className="sd-btn mt-4">
          [ SIGN & UPLOAD ]
        </button>
        {stage && (
          <p className="font-telemetry mt-4 text-[11px] text-sd-accent" aria-live="polite">
            {stage}
          </p>
        )}
      </section>

      {myTracks.length > 0 && (
        <section className="sd-panel mt-8 border border-sd-border p-5">
          <h2 className="font-telemetry text-[11px] text-sd-muted">[ YOUR TRACKS ]</h2>
          <div className="mt-4 flex flex-col gap-6">
            {myTracks.map((t) => (
              <div key={t.id} className="border border-sd-border p-4">
                <label className="font-telemetry text-[10px] text-sd-muted">TITLE</label>
                <input
                  value={t.title || ''}
                  onChange={(e) =>
                    setMyTracks((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, title: e.target.value.slice(0, 120) } : x,
                      ),
                    )
                  }
                  className="sd-input mt-2"
                />
                <label className="font-telemetry mt-3 block text-[10px] text-sd-muted">
                  PRODUCERS
                </label>
                <input
                  value={t.producers || ''}
                  onChange={(e) =>
                    setMyTracks((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, producers: e.target.value.slice(0, 200) } : x,
                      ),
                    )
                  }
                  className="sd-input mt-2"
                />
                <label className="font-telemetry mt-3 block text-[10px] text-sd-muted">
                  FEATURING
                </label>
                <input
                  value={t.featuring || ''}
                  onChange={(e) =>
                    setMyTracks((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, featuring: e.target.value.slice(0, 200) } : x,
                      ),
                    )
                  }
                  className="sd-input mt-2"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={savingId === t.id || deletingId === t.id}
                    aria-busy={savingId === t.id}
                    onClick={() => void saveTrack(t)}
                    className="sd-btn"
                  >
                    {savingId === t.id ? '[ SAVING… ]' : '[ SAVE TRACK ]'}
                  </button>
                  <button
                    type="button"
                    disabled={savingId === t.id || deletingId === t.id}
                    aria-busy={deletingId === t.id}
                    onClick={() => void deleteTrack(t)}
                    className="sd-btn border-sd-accent text-sd-accent hover:bg-sd-accent/10"
                  >
                    {deletingId === t.id ? '[ DELETING… ]' : '[ DELETE ]'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {status && (
        <div
          className={`mt-6 border border-sd-border p-4 ${
            status.includes('FAILED') || status.includes('REJECTED') ? 'text-sd-accent' : 'text-sd-status'
          }`}
          aria-live="polite"
        >
          <p className="font-telemetry text-[11px]">{status}</p>
          {profileSlug &&
            !status.includes('FAILED') &&
            !status.includes('REJECTED') && (
              <Link href={`/artist/${profileSlug}`} className="sd-btn mt-4 inline-flex">
                [ OPEN YOUR SPACE ]
              </Link>
            )}
        </div>
      )}
    </main>
  );
}
