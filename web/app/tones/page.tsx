import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { ToneGroupCard } from '@/components/tones/ToneGroupCard';
import { ToneGroupWithSegments } from '@/types/transcription';
import Link from 'next/link';

export default async function TonesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: groups } = await supabase
    .from('tone_groups')
    .select('*, transcriptions(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const toneGroups: ToneGroupWithSegments[] = (groups ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    user_id: g.user_id as string,
    name: g.name as string,
    description: g.description as string | null,
    song_title: g.song_title as string | null,
    song_artist: g.song_artist as string | null,
    created_at: g.created_at as string,
    segment_count: (g.transcriptions as Array<{ count: number }>)?.[0]?.count ?? 0,
    transcriptions: [],
  }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
              TONE GROUPS
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a7060' }}>
              Build complete pieces by combining transcription segments
            </p>
          </div>
          <Link
            href="/transcribe"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
            style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            + New Transcription
          </Link>
        </div>

        {toneGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {toneGroups.map((g) => (
              <ToneGroupCard key={g.id as string} group={g as Parameters<typeof ToneGroupCard>[0]['group']} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg p-12 text-center"
            style={{ background: '#0e0e0b', border: '1px dashed #2a2520' }}
          >
            <p className="text-sm mb-4" style={{ color: '#7a7060' }}>
              No tone groups yet. Create a transcription and save it to a group to get started.
            </p>
            <Link
              href="/transcribe"
              className="px-5 py-2.5 rounded-lg text-sm font-bold"
              style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Start Transcribing
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
