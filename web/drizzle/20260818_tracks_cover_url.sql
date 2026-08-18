-- Track cover / thumbnail URL (Supabase public URL or /api/covers/{cid})
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS cover_url text;
