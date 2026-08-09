'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import type { AdminUser } from '@/lib/admin';

type Tab = 'overview' | 'users' | 'tracks' | 'audit';

type OverviewStats = {
  artists: number;
  tracksLive: number;
  tracksRemoved: number;
  auditEvents: number;
  clerkUsers: number;
  bannedUsers: number;
  registeredArtists: number;
};

type AdminTrack = {
  id: string;
  title: string;
  name: string;
  cid: string;
  artist_id: string;
  artist_display_name: string;
  artist_email: string;
  created_at: string;
  removed_at?: string | null;
  removed_reason?: string | null;
};

type AuditEvent = {
  id: string;
  at: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
};

export default function AdminPanelPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/admin/overview', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'overview failed');
    setStats(data.stats);
    setAdminId(data.adminId || null);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'users failed');
    setUsers(Array.isArray(data.users) ? data.users : []);
    setAdminId(data.adminId || null);
  }, []);

  const loadTracks = useCallback(async () => {
    const res = await fetch('/api/admin/tracks', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'tracks failed');
    setTracks(Array.isArray(data.tracks) ? data.tracks : []);
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await fetch('/api/admin/audit', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'audit failed');
    setAudit(Array.isArray(data.events) ? data.events : []);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      if (tab === 'overview') await loadOverview();
      if (tab === 'users') await loadUsers();
      if (tab === 'tracks') await loadTracks();
      if (tab === 'audit') await loadAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    }
  }, [tab, loadOverview, loadUsers, loadTracks, loadAudit]);

  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) void load();
  }, [isLoaded, isSignedIn, isAdmin, load]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q),
    );
  }, [users, query]);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.cid.toLowerCase().includes(q) ||
        t.artist_display_name.toLowerCase().includes(q) ||
        t.artist_email.toLowerCase().includes(q),
    );
  }, [tracks, query]);

  async function ban(userId: string, action: 'ban' | 'unban') {
    const reason =
      action === 'ban'
        ? window.prompt('Ban reason (shown in audit / private metadata):', 'Terms of service violation')
        : 'unbanned by admin';
    if (action === 'ban' && (reason === null || !reason.trim())) {
      setStatus('[ CANCELLED ] ban reason required');
      return;
    }
    setBusyId(userId);
    setStatus('');
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: reason || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setStatus(`[ FAIL ] ${data.error || action}`);
      return;
    }
    setStatus(`[ OK ] ${action.toUpperCase()}`);
    await loadUsers();
    if (tab === 'overview') await loadOverview();
  }

  async function removeUser(userId: string, email: string) {
    const reason = window.prompt('Delete reason:', 'Account deleted for policy violation');
    if (reason === null) {
      setStatus('[ CANCELLED ]');
      return;
    }
    const typed = window.prompt(
      `PERMANENT DELETE\n\nDestroys Clerk identity + local artist/tracks for:\n${email}\n\nType DELETE to confirm:`,
    );
    if (typed !== 'DELETE') {
      setStatus('[ CANCELLED ] delete requires exact confirmation');
      return;
    }
    setBusyId(userId);
    setStatus('');
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE', reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setStatus(`[ FAIL ] ${data.error || 'delete'}`);
      return;
    }
    setStatus(`[ OK ] DELETED ${email}`);
    await loadUsers();
  }

  async function trackAction(trackId: string, action: 'takedown' | 'restore' | 'purge') {
    let reason: string | undefined;
    if (action === 'takedown' || action === 'purge') {
      const r = window.prompt(
        action === 'purge' ? 'Purge reason:' : 'Takedown reason:',
        'ToS / copyright / policy violation',
      );
      if (r === null || !r.trim()) {
        setStatus('[ CANCELLED ]');
        return;
      }
      reason = r.trim();
      if (action === 'purge') {
        const ok = window.confirm('Hard-delete this track row from storage? This cannot be undone.');
        if (!ok) return;
      }
    }
    setBusyId(trackId);
    setStatus('');
    const res = await fetch(`/api/admin/tracks/${trackId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setStatus(`[ FAIL ] ${data.error || action}`);
      return;
    }
    setStatus(`[ OK ] ${action.toUpperCase()}`);
    await loadTracks();
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-telemetry text-[11px] text-sd-muted">[ LOADING ]</p>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-telemetry text-[11px] text-sd-muted">[ SIGN IN REQUIRED ]</p>
        <Link href="/sign-in" className="sd-btn mt-4 inline-flex">
          [ SIGN IN ]
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-telemetry text-[11px] text-sd-accent">[ FORBIDDEN / NOT ADMIN ]</p>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'users', label: 'USERS' },
    { id: 'tracks', label: 'TRACKS' },
    { id: 'audit', label: 'AUDIT' },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <p className="font-telemetry mb-2 text-[10px] text-sd-muted">UNIT / ADMIN · CONTROL SYSTEM</p>
      <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-sd-text">ADMIN CONTROL</h1>
      <hr className="sd-rule my-4 max-w-[6rem]" />
      <p className="text-pretty max-w-2xl text-sm text-sd-muted">
        Moderate users and catalog. Ban blocks uploads. Takedown hides tracks. Delete/purge are irreversible.
      </p>

      <div className="font-telemetry mt-6 flex flex-wrap gap-px border border-sd-border bg-sd-border text-[10px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setQuery('');
              setTab(t.id);
            }}
            className={`min-h-11 px-4 ${
              tab === t.id ? 'bg-sd-accent text-white' : 'bg-sd-surface text-sd-muted hover:text-sd-text'
            }`}
          >
            [ {t.label} ]
          </button>
        ))}
        <button type="button" onClick={() => void load()} className="min-h-11 bg-sd-surface px-4 text-sd-muted hover:text-sd-text">
          [ REFRESH ]
        </button>
      </div>

      {(status || error) && (
        <p
          className={`font-telemetry mt-4 text-[11px] ${error ? 'text-sd-accent' : 'text-sd-status'}`}
          aria-live="polite"
        >
          {error ? `[ ERR ] ${error}` : status}
        </p>
      )}

      {tab === 'overview' && stats && (
        <dl className="mt-8 grid gap-px bg-sd-border sm:grid-cols-3">
          {[
            ['CLERK USERS', stats.clerkUsers],
            ['BANNED', stats.bannedUsers],
            ['ARTISTS', stats.registeredArtists],
            ['TRACKS LIVE', stats.tracksLive],
            ['TRACKS REMOVED', stats.tracksRemoved],
            ['AUDIT EVENTS', stats.auditEvents],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-sd-surface p-4">
              <dt className="font-telemetry text-[10px] text-sd-muted">{label}</dt>
              <dd className="font-display mt-2 text-3xl text-sd-text">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(tab === 'users' || tab === 'tracks') && (
        <div className="mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'users' ? 'Filter users…' : 'Filter tracks…'}
            className="sd-input max-w-md"
          />
        </div>
      )}

      {tab === 'users' && (
        <div className="mt-6 border border-sd-border">
          <div className="font-telemetry grid grid-cols-[1.4fr_auto_auto_1fr] gap-px border-b border-sd-border bg-sd-border text-[10px] text-sd-muted">
            <div className="bg-sd-surface px-3 py-2">USER</div>
            <div className="bg-sd-surface px-3 py-2">STATUS</div>
            <div className="bg-sd-surface px-3 py-2">ROLE</div>
            <div className="bg-sd-surface px-3 py-2">ACTIONS</div>
          </div>
          {filteredUsers.map((u) => {
            const self = u.id === adminId;
            const busy = busyId === u.id;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[1.4fr_auto_auto_1fr] items-center gap-px border-b border-sd-border bg-sd-border last:border-b-0"
              >
                <div className="bg-sd-surface px-3 py-3">
                  <p className="text-sm text-sd-text">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="font-telemetry mt-1 text-[10px] text-sd-muted">{u.email || u.id}</p>
                  {u.banReason && (
                    <p className="font-telemetry mt-1 text-[10px] text-sd-accent">REASON: {u.banReason}</p>
                  )}
                </div>
                <div className="font-telemetry bg-sd-surface px-3 py-3 text-[10px]">
                  {u.banned ? (
                    <span className="text-sd-accent">BANNED</span>
                  ) : (
                    <span className="text-sd-status">ACTIVE</span>
                  )}
                </div>
                <div className="font-telemetry bg-sd-surface px-3 py-3 text-[10px] text-sd-muted">
                  {u.role?.toUpperCase() || 'USER'}
                </div>
                <div className="flex flex-wrap gap-2 bg-sd-surface px-3 py-3">
                  {!self ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void ban(u.id, u.banned ? 'unban' : 'ban')}
                        className="sd-btn-ghost min-h-9 px-3 text-[10px]"
                      >
                        {u.banned ? '[ UNBAN ]' : '[ BAN ]'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeUser(u.id, u.email || u.id)}
                        className="sd-btn min-h-9 px-3 text-[10px]"
                      >
                        [ DELETE ]
                      </button>
                    </>
                  ) : (
                    <span className="font-telemetry text-[10px] text-sd-muted">[ YOU ]</span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <p className="font-telemetry bg-sd-surface p-6 text-[11px] text-sd-muted">[ NO USERS ]</p>
          )}
        </div>
      )}

      {tab === 'tracks' && (
        <div className="mt-6 border border-sd-border">
          <div className="font-telemetry grid grid-cols-[1.4fr_1fr_auto_1fr] gap-px border-b border-sd-border bg-sd-border text-[10px] text-sd-muted">
            <div className="bg-sd-surface px-3 py-2">TRACK</div>
            <div className="bg-sd-surface px-3 py-2">ARTIST</div>
            <div className="bg-sd-surface px-3 py-2">STATUS</div>
            <div className="bg-sd-surface px-3 py-2">ACTIONS</div>
          </div>
          {filteredTracks.map((t) => {
            const busy = busyId === t.id;
            const removed = !!t.removed_at;
            return (
              <div
                key={t.id}
                className="grid grid-cols-[1.4fr_1fr_auto_1fr] items-center gap-px border-b border-sd-border bg-sd-border last:border-b-0"
              >
                <div className="bg-sd-surface px-3 py-3">
                  <p className="text-sm text-sd-text">{t.title || t.name}</p>
                  <p className="font-telemetry mt-1 break-all text-[10px] text-sd-muted">{t.cid}</p>
                </div>
                <div className="bg-sd-surface px-3 py-3">
                  <p className="text-sm text-sd-text">{t.artist_display_name}</p>
                  <p className="font-telemetry mt-1 text-[10px] text-sd-muted">{t.artist_email || t.artist_id}</p>
                </div>
                <div className="font-telemetry bg-sd-surface px-3 py-3 text-[10px]">
                  {removed ? (
                    <span className="text-sd-accent">REMOVED</span>
                  ) : (
                    <span className="text-sd-status">LIVE</span>
                  )}
                  {t.removed_reason && (
                    <p className="mt-1 max-w-[10rem] text-sd-muted">{t.removed_reason}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 bg-sd-surface px-3 py-3">
                  {!removed ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void trackAction(t.id, 'takedown')}
                      className="sd-btn-ghost min-h-9 px-3 text-[10px]"
                    >
                      [ TAKEDOWN ]
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void trackAction(t.id, 'restore')}
                      className="sd-btn-ghost min-h-9 px-3 text-[10px]"
                    >
                      [ RESTORE ]
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void trackAction(t.id, 'purge')}
                    className="sd-btn min-h-9 px-3 text-[10px]"
                  >
                    [ PURGE ]
                  </button>
                </div>
              </div>
            );
          })}
          {filteredTracks.length === 0 && (
            <p className="font-telemetry bg-sd-surface p-6 text-[11px] text-sd-muted">[ NO TRACKS ]</p>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="mt-6 border border-sd-border">
          {audit.map((e) => (
            <div key={e.id} className="border-b border-sd-border px-4 py-3 last:border-b-0">
              <p className="font-telemetry text-[10px] text-sd-muted">
                {new Date(e.at).toLocaleString()} · {e.admin_email} · {e.action}
              </p>
              <p className="mt-1 text-sm text-sd-text">
                {e.target_type}/{e.target_id}
              </p>
              <p className="font-telemetry mt-1 text-[11px] text-sd-muted">{e.detail}</p>
            </div>
          ))}
          {audit.length === 0 && (
            <p className="font-telemetry bg-sd-surface p-6 text-[11px] text-sd-muted">[ NO AUDIT EVENTS ]</p>
          )}
        </div>
      )}
    </main>
  );
}
