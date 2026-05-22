-- ─── Burhani Guards Band — Supabase Schema V2 ────────────────────────────────
-- Run this in the Supabase SQL editor (project dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout

-- ─── Tone Groups ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tone_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  song_title  text,
  song_artist text,
  created_at  timestamptz default now()
);

-- Migrate existing rows: add new columns if upgrading from V1
ALTER TABLE tone_groups ADD COLUMN IF NOT EXISTS song_title  text;
ALTER TABLE tone_groups ADD COLUMN IF NOT EXISTS song_artist text;

-- ─── Transcriptions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transcriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  title             text not null,
  source_type       text not null default 'upload',   -- 'youtube' | 'upload'
  source_url        text,                              -- YouTube URL if applicable
  original_key      text not null default 'C',         -- detected key before transposing, e.g. "F#"
  duration          numeric(6,2),
  note_count        integer,
  audio_file_path   text,                              -- Supabase Storage path (original audio)
  stems_paths       jsonb,                             -- { vocals, drums, bass, other } storage paths
  result_json       jsonb not null,
  drum_pattern_json jsonb,                             -- separate drum/bass drum grid
  verified          boolean default false,
  segment_number    integer default 1,
  tone_group_id     uuid references tone_groups(id) on delete set null,
  created_at        timestamptz default now()
);

-- Migrate existing rows: add new columns if upgrading from V1
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS source_type       text not null default 'upload';
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS source_url        text;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS original_key      text;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS stems_paths       jsonb;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS drum_pattern_json jsonb;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS verified          boolean default false;
-- Back-fill original_key from concert_key for V1 rows (only if concert_key column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transcriptions' AND column_name = 'concert_key'
  ) THEN
    UPDATE transcriptions SET original_key = concert_key WHERE original_key IS NULL AND concert_key IS NOT NULL;
  END IF;
END $$;

-- ─── Manual Corrections ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS manual_corrections (
  id               uuid primary key default gen_random_uuid(),
  transcription_id uuid references transcriptions(id) on delete cascade,
  instrument       text not null,   -- 'trumpet' | 'alto_saxophone' | 'trombone' | 'euphonium' | 'drums' | 'bass_drum'
  note_index       integer not null, -- position in the notes array
  original_sargam  text,
  corrected_sargam text,
  corrected_by     uuid references auth.users(id),
  created_at       timestamptz default now(),
  UNIQUE (transcription_id, instrument, note_index)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE transcriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_corrections ENABLE ROW LEVEL SECURITY;

-- Drop and re-create policies so this script is idempotent
DROP POLICY IF EXISTS "Users own transcriptions"     ON transcriptions;
DROP POLICY IF EXISTS "Users own tone_groups"        ON tone_groups;
DROP POLICY IF EXISTS "Users own manual_corrections" ON manual_corrections;

CREATE POLICY "Users own transcriptions"
  ON transcriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own tone_groups"
  ON tone_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read/write corrections for transcriptions they own
CREATE POLICY "Users own manual_corrections"
  ON manual_corrections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM transcriptions
      WHERE transcriptions.id = manual_corrections.transcription_id
        AND transcriptions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcriptions
      WHERE transcriptions.id = manual_corrections.transcription_id
        AND transcriptions.user_id = auth.uid()
    )
  );

-- ─── Storage Buckets ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
  VALUES ('audio-uploads', 'audio-uploads', false)
  ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('audio-stems', 'audio-stems', false)
  ON CONFLICT DO NOTHING;

-- Drop and re-create storage policies
DROP POLICY IF EXISTS "Users access own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users access own stem files"  ON storage.objects;

CREATE POLICY "Users access own audio files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'audio-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'audio-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users access own stem files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'audio-stems' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'audio-stems' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
