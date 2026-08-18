-- Track cover thumbnails (same pattern as artist_avatars)
CREATE TABLE IF NOT EXISTS track_covers (
  cid TEXT PRIMARY KEY,
  bytes BYTEA NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_size INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS cover_url text;
