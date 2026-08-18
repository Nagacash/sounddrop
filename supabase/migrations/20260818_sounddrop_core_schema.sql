-- SoundDrop schema (Supabase / Postgres)
-- Artists are users (Clerk user_id) who have registered an Ed25519 public key.
-- The public key is the ONLY thing the server stores; the private key never leaves the browser.

CREATE TABLE IF NOT EXISTS artists (
  user_id       TEXT PRIMARY KEY,
  email         TEXT,
  display_name  TEXT,
  slug          TEXT UNIQUE,
  bio           TEXT,
  public_key    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);

CREATE TABLE IF NOT EXISTS tracks (
  id             TEXT PRIMARY KEY,
  artist_id      TEXT NOT NULL REFERENCES artists(user_id) ON DELETE CASCADE,
  title          TEXT,
  name           TEXT NOT NULL,
  size           BIGINT NOT NULL,
  type           TEXT NOT NULL,
  cid            TEXT NOT NULL,
  signature      TEXT NOT NULL,
  public_key     TEXT NOT NULL,
  storage_url    TEXT,
  producers      TEXT,
  featuring      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at     TIMESTAMPTZ,
  removed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_cid ON tracks(cid);

CREATE TABLE IF NOT EXISTS track_audio (
  cid           TEXT PRIMARY KEY,
  bytes         BYTEA NOT NULL,
  content_type  TEXT NOT NULL DEFAULT 'audio/mpeg',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id           TEXT PRIMARY KEY,
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id     TEXT NOT NULL,
  admin_email  TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  target_id    TEXT NOT NULL,
  detail       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_events(at DESC);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY artists_public_read ON artists
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY tracks_public_read ON tracks
  FOR SELECT TO anon, authenticated
  USING (removed_at IS NULL);
