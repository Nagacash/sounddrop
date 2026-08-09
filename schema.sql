-- SoundDrop schema (Postgres)
-- Artists are users (Clerk user_id) who have registered an Ed25519 public key.
-- The public key is the ONLY thing the server stores; the private key never leaves the browser.

CREATE TABLE IF NOT EXISTS artists (
  user_id       TEXT PRIMARY KEY,           -- Clerk user id
  email         TEXT,
  display_name  TEXT,
  public_key    TEXT NOT NULL,             -- base64 SPKI, used to verify uploads
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id            TEXT PRIMARY KEY,           -- = cid (content address)
  artist_id     TEXT NOT NULL REFERENCES artists(user_id),
  title         TEXT,
  name          TEXT NOT NULL,             -- original filename
  size          BIGINT NOT NULL,
  type          TEXT NOT NULL,
  cid           TEXT NOT NULL,
  signature     TEXT NOT NULL,             -- base64 Ed25519 sig over canonical meta
  public_key    TEXT NOT NULL,             -- must match artists.public_key at ingest
  storage_url   TEXT,                      -- where the audio bytes live (S3/IPFS)
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);
