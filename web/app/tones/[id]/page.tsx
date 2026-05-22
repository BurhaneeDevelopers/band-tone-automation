import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SegmentCard } from '@/components/tones/SegmentCard';
import { MergedNoteView } from '@/components/tones/MergedNoteView';
import { InstrumentKey, Transcription } from '@/types/transcription';
import Link from 'next/link';

const INSTRUMENTS: InstrumentKey[] = ['trumpet', 'alto_saxophone', 'trombone', 'euphonium'];

export default async function ToneGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: group } = await supabase
    .from('tone_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!group) redirect('/tones');

  const { data: transcriptions } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('tone_group_id', id)
    .eq('user_id', user.id)
    .order('segment_number', { ascending: true });

  const segments = (transcriptions ?? []) as Transcription[];
  const totalDuration = segments.reduce((s, t) => s + (t.duration ?? 0), 0);
  const totalNotes = segments.reduce((s, t) => s + (t.note_count ?? 0), 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/tones" className="text-xs" style={{ color: '#7a7060' }}>← Tone Groups</Link>
          </div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
            {group.name}
          </h1>
          {(group.song_title || group.song_artist) && (
            <p className="text-sm mt-0.5 font-semibold" style={{ color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {[group.song_artist, group.song_title].filter(Boolean).join(' — ')}
            </p>
          )}
          {group.description && <p className="text-sm mt-1" style={{ color: '#7a7060' }}>{group.description}</p>}
          <div className="flex gap-4 mt-2 text-xs" style={{ color: '#7a7060' }}>
            <span>{segments.length} segments</span>
            <span>{totalDuration.toFixed(1)}s total</span>
            <span>{totalNotes} total notes</span>
            {segments.length > 0 && (
              <span style={{ color: segments.every(s => s.verified) ? '#22c55e' : '#b5651d' }}>
                {segments.filter(s => s.verified).length}/{segments.length} verified
              </span>
            )}
          </div>
        </div>

        {/* Segments list */}
        {segments.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#c8bfa8', letterSpacing: '0.06em' }}>
              SEGMENTS
            </h2>
            {segments.map(seg => (
              <SegmentCard key={seg.id} segment={seg} />
            ))}
          </div>
        )}

        {/* Merged notation */}
        {segments.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#c8bfa8', letterSpacing: '0.06em' }}>
              MERGED NOTATION
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INSTRUMENTS.map(key => (
                <div
                  key={key}
                  className="rounded-lg p-4"
                  style={{ background: '#111109', border: '1px solid #2a2520' }}
                >
                  <MergedNoteView segments={segments} instrumentKey={key} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-10 text-center" style={{ background: '#0e0e0b', border: '1px dashed #2a2520' }}>
            <p className="text-sm" style={{ color: '#7a7060' }}>No segments in this tone group yet.</p>
            <Link href="/transcribe" className="text-sm mt-3 inline-block" style={{ color: '#b5651d' }}>
              Add a segment via Transcribe →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
