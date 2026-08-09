'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { generateKeypair, hashPublicKey, signMeta, computeCID } from '@/lib/crypto';
import { isMvpMockModeClient } from '@/lib/mockMode';

const POLICY_KEY = 'sd_policy_accepted_at';
const PROFILE_HASH_KEY = 'sd_profile_hash';

const initialPriv = typeof window !== 'undefined' ? localStorage.getItem('sd_priv') || '' : '';
const initialPub = typeof window !== 'undefined' ? localStorage.getItem('sd_pub') || '' : '';
const initialProfileHash =
  typeof window !== 'undefined' ? localStorage.getItem(PROFILE_HASH_KEY) || '' : '';

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
  const [profileHash, setProfileHash] = useState(initialProfileHash);
  const fileRef = useRef<HTMLInputElement>(null);

  function rememberProfileHash(hash: string) {
    setProfileHash(hash);
    localStorage.setItem(PROFILE_HASH_KEY, hash);
  }

  function goToSpace(hash: string) {
    rememberProfileHash(hash);
    router.push(`/artist/${hash}`);
  }

  useEffect(() => {
    if (profileHash || !initialPub) return;
    void hashPublicKey(initialPub)
      .then((hash) => rememberProfileHash(hash))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from local key
  }, []);

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
        email: user?.primaryEmailAddress?.emailAddress || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`[ FAILED ] ${JSON.stringify(data)}`);
      return false;
    }
    const hash = typeof data.publicKeyHash === 'string' ? data.publicKeyHash : '';
    if (hash) rememberProfileHash(hash);
    if (!quiet) {
      setStatus('[ PUBLIC KEY REGISTERED — OPENING YOUR SPACE… ]');
      if (hash) {
        goToSpace(hash);
        return true;
      }
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
    const meta = {
      name: f.name,
      size: f.size,
      type: f.type || 'audio/mpeg',
      cid,
      ts: new Date().toISOString(),
      title: f.name.replace(/\.mp3$/i, ''),
    };
    setStage('[ SIGNING / ED25519 ]');
    const signature = await signMeta(meta, pk);
    setStage('[ UPLOADING / VERIFY-AT-INGEST ]');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('meta', JSON.stringify(meta));
    fd.append('signature', signature);
    fd.append('publicKey', pb);
    fd.append('artistDisplayName', displayName || user?.fullName || 'Artist');
    const res = await fetch('/api/tracks', { method: 'POST', body: fd });
    const data = await res.json();
    setStage('');
    if (res.ok) {
      const hash =
        typeof data.publicKeyHash === 'string' ? data.publicKeyHash : profileHash;
      if (hash) rememberProfileHash(hash);
      const warn = data.warning ? ` · ${data.warning}` : '';
      setStatus(`[ TRACK INGESTED ] CID ${cid.slice(0, 24)}…${warn}`);
      if (hash) {
        setStatus(`[ TRACK INGESTED — OPENING YOUR SPACE… ]${warn}`);
        goToSpace(hash);
      }
    } else {
      setStatus(`[ REJECTED ] ${JSON.stringify(data)}`);
    }
  }

  function handleRegisterClick() {
    void register();
  }

  function handleUploadClick() {
    void upload();
  }

  if (!isSignedIn && !mock) {
    return (
      <main className="p-6">
        <p className="font-telemetry text-sm text-sd-muted">[ SIGN IN TO ACCESS ARTIST SETUP ]</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="font-telemetry mb-2 text-[10px] text-sd-muted">UNIT / SETUP · KEY LOCAL</p>
      <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-sd-text">ARTIST SETUP</h1>
      <hr className="sd-rule my-4 max-w-[6rem]" />
      <p className="text-pretty text-sm text-sd-muted">
        Your private key stays in this browser. Only your public key is sent to the server.{' '}
        <Link href="/policy/content-responsibility" className="text-sd-accent underline-offset-2 hover:underline">
          Content policy
        </Link>
      </p>

      {profileHash && (
        <div className="sd-panel mt-8 flex flex-wrap items-center justify-between gap-3 border border-sd-border p-5">
          <div>
            <p className="font-telemetry text-[11px] text-sd-muted">[ YOUR SPACE ]</p>
            <p className="mt-1 break-all font-telemetry text-[11px] text-sd-text">
              /artist/{profileHash}
            </p>
          </div>
          <Link href={`/artist/${profileHash}`} className="sd-btn">
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
      </section>

      <section className="sd-panel mt-px border border-sd-border p-5">
        <h2 className="font-telemetry text-[11px] text-sd-muted">[ ED25519 IDENTITY ]</h2>
        <p className="mt-3 break-all text-xs text-sd-muted">PUB: {pubKey || '—'}</p>
        <p className="break-all text-xs text-sd-muted">
          PRIV (LOCAL): {privKey ? `${privKey.slice(0, 24)}…` : '—'}
        </p>
        <button type="button" onClick={handleRegisterClick} className="sd-btn mt-4">
          [ REGISTER PUBLIC KEY ]
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

      {status && (
        <div
          className={`mt-6 border border-sd-border p-4 ${
            status.includes('FAILED') || status.includes('REJECTED') ? 'text-sd-accent' : 'text-sd-status'
          }`}
          aria-live="polite"
        >
          <p className="font-telemetry text-[11px]">{status}</p>
          {profileHash &&
            !status.includes('FAILED') &&
            !status.includes('REJECTED') && (
              <Link
                href={`/artist/${profileHash}`}
                className="sd-btn mt-4 inline-flex"
              >
                [ OPEN YOUR SPACE ]
              </Link>
            )}
        </div>
      )}
    </main>
  );
}
