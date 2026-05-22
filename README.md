# Burhani Guards Band — Music Transcription Tool

A full-stack web application for transcribing audio to sargam notation for Trumpet, Alto Saxophone, Trombone, and Euphonium.

## Structure

```
burhani-guards-band/
├── apps/web/                  # Next.js 15 frontend + API routes
└── services/transcription/    # Python FastAPI + basic-pitch microservice
```

## Setup

### 1. Supabase
Create a project and run this SQL:

```sql
CREATE TABLE tone_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  description text,
  created_at timestamptz default now()
);

CREATE TABLE transcriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text not null,
  concert_key text not null,
  duration numeric(6,2),
  note_count integer,
  audio_file_path text,
  result_json jsonb not null,
  segment_number integer default 1,
  tone_group_id uuid references tone_groups(id),
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own transcriptions" ON transcriptions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own tone_groups" ON tone_groups
  FOR ALL USING (auth.uid() = user_id);
```

Create storage bucket `audio-uploads` (private) with policy:
```sql
CREATE POLICY "Users access own audio" ON storage.objects
  FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Python Service (Railway)
```bash
cd services/transcription
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Next.js App
```bash
cd apps/web
cp .env.example .env.local
# Fill in your Supabase and Railway URLs
npm install
npm run dev
```

## Deployment

- **Next.js**: Deploy `apps/web` to Vercel
- **Python**: Deploy `services/transcription` to Railway (auto-detects Dockerfile)
- Set `ALLOWED_ORIGINS` on Railway to your Vercel URL
